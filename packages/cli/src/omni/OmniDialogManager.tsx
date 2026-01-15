/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable react/prop-types */
import { useEffect, useRef, useCallback, useContext } from 'react';
import { useUIState } from '../ui/contexts/UIStateContext.js';
import { useUIActions } from '../ui/contexts/UIActionsContext.js';
import { appEvents, AppEvent } from '../utils/events.js';
import {
  debugLogger,
  ToolConfirmationOutcome,
  ModelSlashCommandEvent,
  logModelSlashCommand,
} from '@google/gemini-cli-core';
import { ToolCallStatus } from '../ui/types.js';
import { FolderTrustChoice } from '../ui/components/FolderTrustDialog.js';
import { ConfigContext } from '../ui/contexts/ConfigContext.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * OmniDialogManager intercepts dialogs shown in the UI and:
 * 1. Logs them to Omni/dialogs.log for diagnosis.
 * 2. Forwards them to the Hub.
 * 3. The Hub will decide whether to auto-answer based on its internal config.
 */

const isDangerousGitCommand = (command: string): boolean =>
  /git\s+(reset|checkout\s+--|restore|clean).*/.test(command);

export const OmniDialogManager = () => {
  const uiState = useUIState();
  const uiActions = useUIActions();
  const config = useContext(ConfigContext);

  const lastDialogKeyRef = useRef<string | null>(null);
  const notifiedCallIdsRef = useRef<Set<string>>(new Set());
  const toolConfirmationsRef = useRef<
    Map<string, (outcome: ToolConfirmationOutcome) => void>
  >(new Map());

  const getLogPath = useCallback(
    () => 'D:\\SSDProjects\\Tools\\gemini-cli\\Omni\\dialogs.log',
    [],
  );

  const extractText = useCallback((node: unknown): string => {
    if (node == null) return '';
    if (typeof node === 'string' || typeof node === 'number')
      return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (typeof node === 'object' && node !== null) {
      const props = (node as { props?: Record<string, unknown> }).props;
      if (props) {
        if (props['text']) return extractText(props['text']);
        if (props['content']) return extractText(props['content']);
        if (props['children']) return extractText(props['children']);
      }
    }
    return '';
  }, []);

  const logDialog = useCallback(
    (dialog: { type: string; prompt: string; options?: string[] }) => {
      const logPath = getLogPath();
      debugLogger.log(
        `[OmniDialogManager] Logging to ${logPath}: ${dialog.type}`,
      );
      try {
        const logDir = path.dirname(logPath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] TYPE: ${dialog.type} | PROMPT: ${dialog.prompt.replace(/\n/g, ' ')} | OPTIONS: ${dialog.options?.join(', ') || 'none'}\n`;
        fs.appendFileSync(logPath, entry);
      } catch (e) {
        debugLogger.warn(
          `[OmniDialogManager] Failed to log dialog to file: ${e}`,
        );
      }
    },
    [getLogPath],
  );

  const handleAutoResponse = useCallback(
    (type: string, response: string) => {
      debugLogger.log(
        `[OmniDialogManager] handleAutoResponse: type=${type}, response=${response}`,
      );

      if (type.startsWith('tool:')) {
        const callId = type.substring(5);
        const onConfirm = toolConfirmationsRef.current.get(callId);
        if (onConfirm) {
          debugLogger.log(
            `[OmniDialogManager] Resolving tool confirmation ${callId} with ${response}`,
          );
          const outcome =
            response === 'yes'
              ? ToolConfirmationOutcome.ProceedOnce
              : ToolConfirmationOutcome.Cancel;
          onConfirm(outcome);
          appEvents.emit(AppEvent.RemoteDialogResponse, '[DIALOG_FINISHED]');
          return;
        } else {
          debugLogger.warn(
            `[OmniDialogManager] No callback found for tool confirmation ${callId}`,
          );
        }
      }

      if (type === 'confirmation' && uiState.confirmationRequest) {
        uiState.confirmationRequest.onConfirm(response === 'yes');
        appEvents.emit(AppEvent.RemoteDialogResponse, '[DIALOG_FINISHED]');
      } else if (
        type === 'extension_update' &&
        uiState.confirmUpdateExtensionRequests.length > 0
      ) {
        uiState.confirmUpdateExtensionRequests[0].onConfirm(response === 'yes');
        appEvents.emit(AppEvent.RemoteDialogResponse, '[DIALOG_FINISHED]');
      } else if (
        type === 'shell_confirmation' &&
        uiState.shellConfirmationRequest
      ) {
        const outcome =
          response === 'yes'
            ? ToolConfirmationOutcome.ProceedOnce
            : ToolConfirmationOutcome.Cancel;
        uiState.shellConfirmationRequest.onConfirm(outcome);
        appEvents.emit(AppEvent.RemoteDialogResponse, '[DIALOG_FINISHED]');
      } else if (type === 'pro_quota' && uiState.proQuotaRequest) {
        uiActions.handleProQuotaChoice(
          response as 'retry_later' | 'retry_once' | 'retry_always' | 'upgrade',
        );
        appEvents.emit(AppEvent.RemoteDialogResponse, '[DIALOG_FINISHED]');
      } else if (type === 'folder_trust' && uiState.isFolderTrustDialogOpen) {
        const choice =
          response === 'trust'
            ? FolderTrustChoice.TRUST_FOLDER
            : FolderTrustChoice.DO_NOT_TRUST;
        uiActions.handleFolderTrustSelect(choice);
        appEvents.emit(AppEvent.RemoteDialogResponse, '[DIALOG_FINISHED]');
      } else if (type === 'ide_nudge' && uiState.shouldShowIdePrompt) {
        uiActions.handleIdePromptComplete({
          userSelection: response as 'yes' | 'no' | 'dismiss',
          isExtensionPreInstalled: false,
        });
        appEvents.emit(AppEvent.RemoteDialogResponse, '[DIALOG_FINISHED]');
      } else if (type === 'model_dialog') {
        if (response === 'close') {
          uiActions.closeModelDialog();
        } else if (response === 'Manual') {
          uiActions.setModelDialogView('manual');
        } else if (config) {
          config.setModel(response, true);
          const event = new ModelSlashCommandEvent(response);
          logModelSlashCommand(config, event);
          uiActions.closeModelDialog();
        }
        appEvents.emit(AppEvent.RemoteDialogResponse, '[DIALOG_FINISHED]');
      } else if (type === 'auth_in_progress') {
        if (response === 'cancel') {
          uiActions.onAuthError('Authentication cancelled.');
          appEvents.emit(AppEvent.RemoteDialogResponse, '[DIALOG_FINISHED]');
        }
      }
    },
    [uiState, uiActions, config],
  );

  // Effect for global dialogs
  useEffect(() => {
    let currentDialog: {
      type: string;
      prompt: string;
      options?: string[];
    } | null = null;

    if (uiState.showIdeRestartPrompt) {
      currentDialog = {
        type: 'ide_restart',
        prompt: `IDE integration needs a restart: ${uiState.ideTrustRestartReason}`,
        options: ['ok'],
      };
    } else if (uiState.proQuotaRequest) {
      currentDialog = {
        type: 'pro_quota',
        prompt: uiState.proQuotaRequest.message,
        options: ['retry_later', 'retry_once', 'retry_always', 'upgrade'],
      };
    } else if (uiState.shouldShowIdePrompt) {
      currentDialog = {
        type: 'ide_nudge',
        prompt:
          'Omni detected an IDE. Would you like to install the integration?',
        options: ['yes', 'no', 'dismiss'],
      };
    } else if (uiState.isFolderTrustDialogOpen) {
      currentDialog = {
        type: 'folder_trust',
        prompt: 'Do you trust the files in this folder?',
        options: ['trust', 'no_trust'],
      };
    } else if (uiState.shellConfirmationRequest) {
      const isDangerous = uiState.shellConfirmationRequest.commands.some(
        (cmd) => isDangerousGitCommand(cmd),
      );
      if (!isDangerous) {
        currentDialog = {
          type: 'shell_confirmation',
          prompt: uiState.shellConfirmationRequest.commands.join('\n'),
          options: ['yes', 'no'],
        };
      } else {
        debugLogger.log(
          `[OmniDialogManager] Dangerous git command detected. Bypassing Omni Hub.`,
        );
      }
    } else if (uiState.loopDetectionConfirmationRequest) {
      currentDialog = {
        type: 'loop_detection',
        prompt:
          'Repetitive tool calls detected. Do you want to keep loop detection enabled or disable it?',
        options: ['keep', 'disable'],
      };
    } else if (uiState.confirmationRequest) {
      currentDialog = {
        type: 'confirmation',
        prompt: extractText(uiState.confirmationRequest.prompt),
        options: ['yes', 'no'],
      };
    } else if (uiState.confirmUpdateExtensionRequests.length > 0) {
      currentDialog = {
        type: 'extension_update',
        prompt: extractText(uiState.confirmUpdateExtensionRequests[0].prompt),
        options: ['yes', 'no'],
      };
    } else if (uiState.isThemeDialogOpen) {
      currentDialog = {
        type: 'theme_dialog',
        prompt: 'Select a theme',
        options: ['cancel'],
      };
    } else if (uiState.isSettingsDialogOpen) {
      currentDialog = {
        type: 'settings_dialog',
        prompt: 'Settings',
        options: ['close'],
      };
    } else if (uiState.isModelDialogOpen) {
      const modelOptions = [...uiState.availableModels];
      if (uiState.modelDialogView === 'main') {
        modelOptions.push('Manual');
      }
      modelOptions.push('close');

      currentDialog = {
        type: 'model_dialog',
        prompt:
          uiState.modelDialogView === 'main'
            ? 'Select Model'
            : 'Select Model (Manual)',
        options: modelOptions,
      };
    } else if (uiState.isAuthenticating) {
      currentDialog = {
        type: 'auth_in_progress',
        prompt: 'Authentication in progress...',
        options: [],
      };
    } else if (uiState.isAwaitingApiKeyInput) {
      currentDialog = {
        type: 'api_key_input',
        prompt: 'Please enter your API key',
        options: ['submit', 'cancel'],
      };
    } else if (uiState.isAuthDialogOpen) {
      currentDialog = {
        type: 'auth_dialog',
        prompt: 'Select authentication method',
        options: ['cancel'],
      };
    } else if (uiState.isEditorDialogOpen) {
      currentDialog = {
        type: 'editor_dialog',
        prompt: 'Select your preferred editor',
        options: ['exit'],
      };
    } else if (uiState.showPrivacyNotice) {
      currentDialog = {
        type: 'privacy_notice',
        prompt: 'Privacy Notice',
        options: ['exit'],
      };
    } else if (uiState.isSessionBrowserOpen) {
      currentDialog = {
        type: 'session_browser',
        prompt: 'Select a session to resume',
        options: ['exit'],
      };
    } else if (uiState.isPermissionsDialogOpen) {
      currentDialog = {
        type: 'permissions_dialog',
        prompt: 'Modify folder trust permissions',
        options: ['exit'],
      };
    } else if (uiState.customDialog) {
      const dialogName =
        (uiState.customDialog as { type?: { name?: string } })?.type?.name ||
        'CustomDialog';
      currentDialog = {
        type: `custom:${dialogName}`,
        prompt: `A custom dialog (${dialogName}) is open.`,
        options: ['ok'],
      };
    }

    if (currentDialog) {
      const dialogKey = `${currentDialog.type}:${currentDialog.prompt}`;
      if (lastDialogKeyRef.current !== dialogKey) {
        logDialog(currentDialog);
        debugLogger.log(
          `[OmniDialogManager] Notifying hub of global dialog: ${currentDialog.type}`,
        );
        appEvents.emit(AppEvent.RemoteDialog, currentDialog);
        lastDialogKeyRef.current = dialogKey;
      }
    } else if (lastDialogKeyRef.current !== null) {
      // Dialog was closed
      debugLogger.log(
        `[OmniDialogManager] Global dialog closed. Clearing remote.`,
      );
      appEvents.emit(AppEvent.RemoteDialogResponse, '[DIALOG_FINISHED]');
      lastDialogKeyRef.current = null;
    }
  }, [
    uiState.confirmationRequest,
    uiState.confirmUpdateExtensionRequests,
    uiState.shellConfirmationRequest,
    uiState.loopDetectionConfirmationRequest,
    uiState.proQuotaRequest,
    uiState.isFolderTrustDialogOpen,
    uiState.shouldShowIdePrompt,
    uiState.showIdeRestartPrompt,
    uiState.ideTrustRestartReason,
    uiState.isThemeDialogOpen,
    uiState.isSettingsDialogOpen,
    uiState.isModelDialogOpen,
    uiState.modelDialogView,
    uiState.availableModels,
    uiState.isAuthenticating,
    uiState.isAuthDialogOpen,
    uiState.isAwaitingApiKeyInput,
    uiState.isEditorDialogOpen,
    uiState.showPrivacyNotice,
    uiState.isSessionBrowserOpen,
    uiState.isPermissionsDialogOpen,
    uiState.customDialog,
    extractText,
    logDialog,
  ]);

  // Effect for inline tool confirmations in history AND pending items
  useEffect(() => {
    const currentConfirmingIds = new Set<string>();
    const allItems = [...uiState.history, ...uiState.pendingHistoryItems];

    if (uiState.pendingHistoryItems.length > 0) {
      debugLogger.log(
        `[OmniDialogManager] Scanning ${uiState.pendingHistoryItems.length} pending items`,
      );
    }

    for (const item of allItems) {
      if (item && item.type === 'tool_group') {
        for (const tool of item.tools) {
          if (
            tool.status === ToolCallStatus.Confirming &&
            tool.confirmationDetails?.onConfirm
          ) {
            const callId = tool.callId;
            currentConfirmingIds.add(callId);

            if (!notifiedCallIdsRef.current.has(callId)) {
              let prompt = `Allow execution of: '${tool.name}'?`;
              const details = tool.confirmationDetails;

              if (details.type === 'exec') {
                if (isDangerousGitCommand(details.command)) {
                  debugLogger.log(
                    `[OmniDialogManager] Dangerous git tool call detected. Bypassing Omni Hub.`,
                  );
                  continue;
                }
                prompt = `Allow execution of: '${details.command}'?`;
              } else if (details.type === 'edit') {
                prompt = `Apply changes to ${details.fileName}?`;
              } else if (details.type === 'mcp') {
                prompt = `Allow execution of MCP tool "${details.toolName}" from server "${details.serverName}"?`;
              }

              const dialog = {
                type: `tool:${callId}`,
                prompt,
                options: ['yes', 'no'],
              };
              logDialog(dialog);
              debugLogger.log(
                `[OmniDialogManager] Notifying hub of tool confirmation: ${callId}. Prompt: ${prompt}`,
              );

              // Store the callback for resolution
              toolConfirmationsRef.current.set(
                callId,
                tool.confirmationDetails.onConfirm,
              );
              appEvents.emit(AppEvent.RemoteDialog, dialog);
              notifiedCallIdsRef.current.add(callId);
            }
          }
        }
      }
    }

    // Cleanup notified IDs that are no longer present or no longer confirming
    for (const id of Array.from(notifiedCallIdsRef.current)) {
      if (!currentConfirmingIds.has(id)) {
        debugLogger.log(
          `[OmniDialogManager] Cleaning up notification state for callId: ${id}`,
        );
        notifiedCallIdsRef.current.delete(id);
        toolConfirmationsRef.current.delete(id);
      }
    }
  }, [uiState.history, uiState.pendingHistoryItems, logDialog]);

  const handleAutoResponseRef = useRef(handleAutoResponse);
  useEffect(() => {
    handleAutoResponseRef.current = handleAutoResponse;
  }, [handleAutoResponse]);

  useEffect(() => {
    const onRemoteResponse = (response: string) => {
      debugLogger.log(
        `[OmniDialogManager] Received RemoteDialogResponse: ${response}`,
      );
      const key = lastDialogKeyRef.current;
      if (key) {
        const type = key.split(':')[0];
        handleAutoResponseRef.current(type, response);
      } else {
        // Fallback: check if it's a tool response
        const lastNotifiedCallId = Array.from(notifiedCallIdsRef.current).pop();
        if (lastNotifiedCallId) {
          debugLogger.log(
            `[OmniDialogManager] Routing response to last notified tool: ${lastNotifiedCallId}`,
          );
          handleAutoResponseRef.current(`tool:${lastNotifiedCallId}`, response);
        } else {
          debugLogger.warn(
            `[OmniDialogManager] Received remote response but no active dialog or tool found.`,
          );
        }
      }
    };

    appEvents.on(AppEvent.RemoteDialogResponse, onRemoteResponse);
    return () => {
      appEvents.off(AppEvent.RemoteDialogResponse, onRemoteResponse);
    };
  }, []);

  return null;
};
