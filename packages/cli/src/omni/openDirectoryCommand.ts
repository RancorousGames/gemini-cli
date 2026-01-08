/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import open from 'open';
import process from 'node:process';
import {
  type CommandContext,
  type SlashCommand,
  CommandKind,
} from '../ui/commands/types.js';
import { MessageType } from '../ui/types.js';

export const openDirectoryCommand: SlashCommand = {
  name: 'od',
  altNames: ['open-directory'],
  description: 'Open the workspace directory in the default file manager',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: async (context: CommandContext): Promise<void> => {
    const config = context.services.config;
    if (!config) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Configuration is not available.',
        },
        Date.now(),
      );
      return;
    }

    const targetDir = config.getTargetDir();

    if (process.env['SANDBOX'] && process.env['SANDBOX'] !== 'sandbox-exec') {
      context.ui.addItem(
        {
          type: MessageType.WARNING,
          text: 'Cannot open host directory from within a sandbox.',
        },
        Date.now(),
      );
    } else {
      context.ui.addItem(
        {
          type: MessageType.INFO,
          text: `Opening directory: ${targetDir}`,
        },
        Date.now(),
      );
      await open(targetDir);
    }
  },
};
