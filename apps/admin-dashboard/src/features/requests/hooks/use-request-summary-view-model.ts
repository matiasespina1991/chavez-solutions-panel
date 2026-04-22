import { auth } from '@/lib/firebase';
import { hasIssuedWorkOrder } from '@/features/requests/lib/request-status';
import type { RequestListRow as RequestRow } from '@/types/domain';
import { useCallback } from 'react';

interface UseRequestSummaryViewModelParams {
  selectedRow: RequestRow | null;
  onCloseSummaryDialog: () => void;
  onNavigateToConfigurator: (requestId: string) => void;
}

interface UseRequestSummaryViewModelResult {
  canApproveSelectedRow: boolean;
  canExecuteApprovedSelectedRow: boolean;
  canShowExecuteWorkOrderButton: boolean;
  canEditSelectedRow: boolean;
  approverLabel: string;
  nowLabel: string;
  handleDialogEdit: () => void;
}

export const useRequestSummaryViewModel = ({
  selectedRow,
  onCloseSummaryDialog,
  onNavigateToConfigurator
}: UseRequestSummaryViewModelParams): UseRequestSummaryViewModelResult => {
  const handleDialogEdit = useCallback(() => {
    if (!selectedRow) return;

    if (hasIssuedWorkOrder(selectedRow)) {
      return;
    }

    onCloseSummaryDialog();
    onNavigateToConfigurator(selectedRow.id);
  }, [onCloseSummaryDialog, onNavigateToConfigurator, selectedRow]);

  const canApproveSelectedRow =
    selectedRow?.status === 'submitted' &&
    selectedRow.approvalStatus !== 'approved';
  const canExecuteApprovedSelectedRow =
    selectedRow?.status === 'submitted' &&
    selectedRow.approvalStatus === 'approved' &&
    !hasIssuedWorkOrder(selectedRow);
  const canShowExecuteWorkOrderButton =
    canApproveSelectedRow || canExecuteApprovedSelectedRow;
  const canEditSelectedRow = selectedRow
    ? !hasIssuedWorkOrder(selectedRow)
    : false;

  const approverLabel =
    auth.currentUser?.displayName ||
    auth.currentUser?.email ||
    'Usuario autenticado';

  const nowLabel = new Date().toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return {
    canApproveSelectedRow,
    canExecuteApprovedSelectedRow,
    canShowExecuteWorkOrderButton,
    canEditSelectedRow,
    approverLabel,
    nowLabel,
    handleDialogEdit
  };
};
