import { useCallback } from 'react';
import type { RequestListRow as RequestRow } from '@/types/domain';

interface UseRequestListTableActionsParams {
  onOpenSummaryDialog: (row: RequestRow) => void;
  onNavigateToConfigurator: (requestId: string) => void;
  onOpenExecuteWorkOrderDialog: (row: RequestRow) => void;
  onOpenRejectDialog: (row: RequestRow) => void;
  onToggleWorkOrder: (row: RequestRow) => Promise<void>;
  onOpenDeleteDialog: (row: RequestRow) => void;
}

export function useRequestListTableActions({
  onOpenSummaryDialog,
  onNavigateToConfigurator,
  onOpenExecuteWorkOrderDialog,
  onOpenRejectDialog,
  onToggleWorkOrder,
  onOpenDeleteDialog
}: UseRequestListTableActionsParams) {
  const handleOpenSummary = useCallback(
    (row: RequestRow) => {
      onOpenSummaryDialog(row);
    },
    [onOpenSummaryDialog]
  );

  const handleEdit = useCallback(
    (row: RequestRow) => {
      onNavigateToConfigurator(row.id);
    },
    [onNavigateToConfigurator]
  );

  const handleExecuteWorkOrder = useCallback(
    (row: RequestRow) => {
      onOpenExecuteWorkOrderDialog(row);
    },
    [onOpenExecuteWorkOrderDialog]
  );

  const handleOpenReject = useCallback(
    (row: RequestRow) => {
      onOpenRejectDialog(row);
    },
    [onOpenRejectDialog]
  );

  const handleToggleWorkOrder = useCallback(
    (row: RequestRow) => {
      void onToggleWorkOrder(row);
    },
    [onToggleWorkOrder]
  );

  const handleOpenDelete = useCallback(
    (row: RequestRow) => {
      onOpenDeleteDialog(row);
    },
    [onOpenDeleteDialog]
  );

  return {
    handleOpenSummary,
    handleEdit,
    handleExecuteWorkOrder,
    handleOpenReject,
    handleToggleWorkOrder,
    handleOpenDelete
  };
}
