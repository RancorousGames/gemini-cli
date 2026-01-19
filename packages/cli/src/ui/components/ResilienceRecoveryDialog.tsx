/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ResilienceRecoveryRequest } from '../types.js';
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';

interface Props {
  request: ResilienceRecoveryRequest;
}

export const ResilienceRecoveryDialog: React.FC<Props> = ({ request }) => {
  console.error('!!! ResilienceRecoveryDialog COMPONENT RENDERING !!!');
  const options = [
    { label: 'Deep Rollback (Recommended)', value: 'deep_rollback', key: '1' },
    { label: 'Clear Current Turn', value: 'clear_turn', key: '2' },
    { label: 'Ignore / Export Log', value: 'ignore', key: '3' },
  ];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="red">
          ⚠️ API ERROR DETECTED
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text>{request.error.message || 'An unrecoverable error occurred.'}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text italic color="gray">
          Choose a recovery strategy to continue your session:
        </Text>
      </Box>
      <RadioButtonSelect
        items={options}
        onSelect={(item: any) => request.onComplete({ action: item.value as any })}
      />
    </Box>
  );
};
