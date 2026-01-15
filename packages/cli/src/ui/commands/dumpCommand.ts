/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { partToString } from '@google/gemini-cli-core';
import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import fs from 'node:fs';
import path from 'node:path';

export const dumpCommand: SlashCommand = {
  name: 'dump',
  description: 'Dump the conversation history to SessionDump.txt',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: async (context) => {
    const chatRecordingService = context.services.config
      ?.getGeminiClient()
      ?.getChat()
      .getChatRecordingService();

    if (!chatRecordingService) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Chat recording service not available.',
      };
    }

    const conversation = chatRecordingService.getConversation();
    if (!conversation || conversation.messages.length === 0) {
      return {
        type: 'message',
        messageType: 'info',
        content: 'No conversation history to dump.',
      };
    }

    const dumpPath = path.join(
      context.services.config!.getWorkingDir(),
      'SessionDump.txt',
    );

    let dumpContent = '';
    for (const message of conversation.messages) {
      dumpContent += `[${message.type.toUpperCase()}] ${message.timestamp}\n`;
      dumpContent += partToString(message.content) + '\n';

      if (message.type === 'gemini') {
        if (message.thoughts && message.thoughts.length > 0) {
          dumpContent += 'Thoughts:\n';
          for (const thought of message.thoughts) {
            dumpContent += `- ${thought.subject}: ${thought.description}\n`;
          }
        }

        if (message.toolCalls && message.toolCalls.length > 0) {
          dumpContent += 'Tool Calls:\n';
          for (const toolCall of message.toolCalls) {
            dumpContent += `- ${toolCall.name}(${JSON.stringify(
              toolCall.args,
            )})\n`;
            if (toolCall.result) {
              dumpContent += `  Result: ${partToString(toolCall.result)}\n`;
            }
          }
        }
      }
      dumpContent += '\n' + '='.repeat(40) + '\n\n';
    }

    try {
      fs.writeFileSync(dumpPath, dumpContent, 'utf8');
      return {
        type: 'message',
        messageType: 'info',
        content: `Conversation history dumped to ${dumpPath}`,
      };
    } catch (error) {
      return {
        type: 'message',
        messageType: 'error',
        content: `Failed to dump conversation history: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
};
