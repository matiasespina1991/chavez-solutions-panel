'use client';

import { createContext, useContext } from 'react';
import type {
  DraggableAttributes,
  DraggableSyntheticListeners
} from '@dnd-kit/core';

type RowDndContextValue = {
  attributes: DraggableAttributes;
  listeners?: DraggableSyntheticListeners;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  isDragging: boolean;
  isDisabled: boolean;
};

const RowDndContext = createContext<RowDndContextValue | null>(null);

export const RowDndProvider = RowDndContext.Provider;

export function useRowDndContext() {
  return useContext(RowDndContext);
}
