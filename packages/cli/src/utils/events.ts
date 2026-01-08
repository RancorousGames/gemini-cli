/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExtensionEvents, McpClient } from '@google/gemini-cli-core';
import { EventEmitter } from 'node:events';

export enum AppEvent {
  OpenDebugConsole = 'open-debug-console',
  OauthDisplayMessage = 'oauth-display-message',
  Flicker = 'flicker',
  McpClientUpdate = 'mcp-client-update',
  SelectionWarning = 'selection-warning',
  PasteTimeout = 'paste-timeout',
  RemotePrompt = 'remote-prompt',
  RemoteResponse = 'remote-response',
  RemoteThought = 'remote-thought',
  RemoteCodeDiff = 'remote-code-diff',
  RemoteToolCall = 'remote-tool-call',
  RequestRemoteHistory = 'request-remote-history',
  RemoteDialog = 'remote-dialog',
  RemoteDialogResponse = 'remote-dialog-response',
}

export interface AppEvents extends ExtensionEvents {
  [AppEvent.OpenDebugConsole]: never[];
  [AppEvent.OauthDisplayMessage]: string[];
  [AppEvent.Flicker]: never[];
  [AppEvent.McpClientUpdate]: Array<Map<string, McpClient> | never>;
  [AppEvent.SelectionWarning]: never[];
  [AppEvent.PasteTimeout]: never[];
  [AppEvent.RemotePrompt]: string[];
  [AppEvent.RemoteResponse]: string[];
  [AppEvent.RemoteThought]: string[];
  [AppEvent.RemoteCodeDiff]: string[];
  [AppEvent.RemoteToolCall]: string[];
  [AppEvent.RequestRemoteHistory]: never[];
  [AppEvent.RemoteDialog]: Array<{
    type: string;
    prompt: string;
    options?: string[];
  }>;
  [AppEvent.RemoteDialogResponse]: string[];
}

export const appEvents = new EventEmitter<AppEvents>();
