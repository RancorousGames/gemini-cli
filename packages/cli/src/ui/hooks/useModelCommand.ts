/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';

interface UseModelCommandReturn {
  isModelDialogOpen: boolean;
  modelDialogView: 'main' | 'manual';
  openModelDialog: () => void;
  closeModelDialog: () => void;
  setModelDialogView: (view: 'main' | 'manual') => void;
}

export const useModelCommand = (): UseModelCommandReturn => {
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [modelDialogView, setModelDialogView] = useState<'main' | 'manual'>(
    'main',
  );

  const openModelDialog = useCallback(() => {
    setModelDialogView('main');
    setIsModelDialogOpen(true);
  }, []);

  const closeModelDialog = useCallback(() => {
    setIsModelDialogOpen(false);
  }, []);

  return {
    isModelDialogOpen,
    modelDialogView,
    openModelDialog,
    closeModelDialog,
    setModelDialogView,
  };
};
