/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as net from 'node:net';
import { appEvents, AppEvent } from '../utils/events.js';
import { debugLogger } from '@google/gemini-cli-core';

export function startRemoteControl() {
  const pipeName = '\\\\.\\pipe\\gemini-cli-' + process.pid;
  debugLogger.log(`[RemoteControl] Attempting to start server on ${pipeName}`);

  const server = net.createServer((socket) => {
    debugLogger.log(`Remote control client connected on ${pipeName}`);

    let buffer = '';
    socket.on('data', (data) => {
      buffer += data.toString();
      if (buffer.includes('\n')) {
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.command === 'prompt' && msg.text) {
              appEvents.emit(AppEvent.RemotePrompt, msg.text);
            } else if (msg.command === 'getHistory') {
              appEvents.emit(AppEvent.RequestRemoteHistory);
            } else if (msg.command === 'dialogResponse' && msg.response) {
              appEvents.emit(AppEvent.RemoteDialogResponse, msg.response);
            }
          } catch (e) {
            debugLogger.error(`Failed to parse remote command: ${e}`);
          }
        }
      }
    });

    const onResponse = (text: string) => {
      try {
        debugLogger.log(
          `Remote control sending response: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
        );
        socket.write(JSON.stringify({ type: 'response', text }) + '\n');
      } catch (e) {
        debugLogger.error(`Failed to write to remote control socket: ${e}`);
      }
    };

    const onThought = (text: string) => {
      try {
        debugLogger.log(
          `Remote control sending thought: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
        );
        socket.write(JSON.stringify({ type: 'thought', text }) + '\n');
      } catch (e) {
        debugLogger.error(
          `Failed to write thought to remote control socket: ${e}`,
        );
      }
    };

    const onCodeDiff = (text: string) => {
      try {
        debugLogger.log('Remote control sending codeDiff');
        socket.write(JSON.stringify({ type: 'codeDiff', text }) + '\n');
      } catch (e) {
        debugLogger.error(
          `Failed to write codeDiff to remote control socket: ${e}`,
        );
      }
    };

    const onToolCall = (text: string) => {
      try {
        debugLogger.log(`Remote control sending toolCall: ${text}`);
        socket.write(JSON.stringify({ type: 'toolCall', text }) + '\n');
      } catch (e) {
        debugLogger.error(
          `Failed to write toolCall to remote control socket: ${e}`,
        );
      }
    };

    const onDialog = (data: {
      type: string;
      prompt: string;
      options?: string[];
    }) => {
      try {
        debugLogger.log(`Remote control sending dialog: ${data.type}`);
        // Wrap the data so 'type' is 'dialog' for the Hub's parser,
        // and put the original type into 'dialogType'.
        const payload = {
          type: 'dialog',
          dialogType: data.type,
          prompt: data.prompt,
          options: data.options,
        };
        socket.write(JSON.stringify(payload) + '\n');
      } catch (e) {
        debugLogger.error(
          `Failed to write dialog to remote control socket: ${e}`,
        );
      }
    };

    appEvents.on(AppEvent.RemoteResponse, onResponse);
    appEvents.on(AppEvent.RemoteThought, onThought);
    appEvents.on(AppEvent.RemoteCodeDiff, onCodeDiff);
    appEvents.on(AppEvent.RemoteToolCall, onToolCall);
    appEvents.on(AppEvent.RemoteDialog, onDialog);

    socket.on('close', () => {
      appEvents.off(AppEvent.RemoteResponse, onResponse);
      appEvents.off(AppEvent.RemoteThought, onThought);
      appEvents.off(AppEvent.RemoteCodeDiff, onCodeDiff);
      appEvents.off(AppEvent.RemoteToolCall, onToolCall);
      appEvents.off(AppEvent.RemoteDialog, onDialog);
      debugLogger.log('Remote control client disconnected');
    });

    socket.on('error', (err) => {
      debugLogger.error(`Remote control socket error: ${err}`);
    });
  });

  server.on('error', (err: unknown) => {
    debugLogger.error(`Remote control server error: ${err}`);
  });

  try {
    server.listen(pipeName, () => {
      debugLogger.log(`[RemoteControl] Server is now listening on ${pipeName}`);
    });
  } catch (err) {
    debugLogger.error(`Failed to start remote control server: ${err}`);
  }

  process.on('exit', () => {
    try {
      server.close();
    } catch (_e) {
      // Ignore cleanup errors
    }
  });
}
