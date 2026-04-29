import type { RequestListRow as RequestRow } from '@/types/domain';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { useRequestDownloadAction } from '@/features/requests/hooks/use-request-download-action';
import { useRequestModerationActions } from '@/features/requests/hooks/use-request-moderation-actions';
import { useWorkOrderActions } from '@/features/requests/hooks/use-work-order-actions';

interface UseRequestActionsParams {
  selectedRow: RequestRow | null;
  setRows: Dispatch<SetStateAction<RequestRow[]>>;
  setSelectedRow: Dispatch<SetStateAction<RequestRow | null>>;
  onCloseSummaryDialog: () => void;
}

interface UseRequestActionsResult {
  pendingActionId: string | null;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  isWorkOrderToggleDialogOpen: boolean;
  setIsWorkOrderToggleDialogOpen: Dispatch<SetStateAction<boolean>>;
  rowToToggleWorkOrder: RequestRow | null;
  setRowToToggleWorkOrder: Dispatch<SetStateAction<RequestRow | null>>;
  workOrderToggleAction: 'pause' | 'resume' | null;
  setWorkOrderToggleAction: Dispatch<SetStateAction<'pause' | 'resume' | null>>;
  workOrderToggleNotes: string;
  setWorkOrderToggleNotes: Dispatch<SetStateAction<string>>;
  isDeleting: boolean;
  isTogglingWorkOrder: boolean;
  isRejectDialogOpen: boolean;
  setIsRejectDialogOpen: Dispatch<SetStateAction<boolean>>;
  setRowToDelete: Dispatch<SetStateAction<RequestRow | null>>;
  rowToReject: RequestRow | null;
  setRowToReject: Dispatch<SetStateAction<RequestRow | null>>;
  isExecuteWorkOrderDialogOpen: boolean;
  setIsExecuteWorkOrderDialogOpen: Dispatch<SetStateAction<boolean>>;
  rowToExecuteWorkOrder: RequestRow | null;
  setRowToExecuteWorkOrder: Dispatch<SetStateAction<RequestRow | null>>;
  rejectFeedback: string;
  setRejectFeedback: Dispatch<SetStateAction<string>>;
  isRejecting: boolean;
  isDialogDownloading: boolean;
  openWorkOrderToggleDialog: (row: RequestRow) => void;
  handleConfirmWorkOrderToggle: () => Promise<void>;
  handleWorkOrderAction: (row: RequestRow) => Promise<void>;
  handleApproveRequest: (row: RequestRow) => Promise<void>;
  openExecuteWorkOrderDialog: (row: RequestRow) => void;
  handleConfirmExecuteWorkOrder: () => Promise<void>;
  openRejectDialog: (row: RequestRow) => void;
  handleConfirmRejectRequest: () => Promise<void>;
  handleDeleteRequest: () => Promise<void>;
  handleDialogDelete: () => void;
  handleDialogResumeWorkOrder: () => void;
  handleDialogDownload: () => Promise<void>;
}

export const useRequestActions = ({
  selectedRow,
  setRows,
  setSelectedRow,
  onCloseSummaryDialog
}: UseRequestActionsParams): UseRequestActionsResult => {
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const workOrderActions = useWorkOrderActions({
    selectedRow,
    setRows,
    setSelectedRow,
    setPendingActionId
  });

  const moderationActions = useRequestModerationActions({
    selectedRow,
    setRows,
    setSelectedRow,
    setPendingActionId,
    onCloseSummaryDialog
  });

  const { isDialogDownloading, handleDialogDownload } =
    useRequestDownloadAction(selectedRow);

  return {
    pendingActionId,
    isDeleteDialogOpen: moderationActions.isDeleteDialogOpen,
    setIsDeleteDialogOpen: moderationActions.setIsDeleteDialogOpen,
    isWorkOrderToggleDialogOpen: workOrderActions.isWorkOrderToggleDialogOpen,
    setIsWorkOrderToggleDialogOpen: workOrderActions.setIsWorkOrderToggleDialogOpen,
    rowToToggleWorkOrder: workOrderActions.rowToToggleWorkOrder,
    setRowToToggleWorkOrder: workOrderActions.setRowToToggleWorkOrder,
    workOrderToggleAction: workOrderActions.workOrderToggleAction,
    setWorkOrderToggleAction: workOrderActions.setWorkOrderToggleAction,
    workOrderToggleNotes: workOrderActions.workOrderToggleNotes,
    setWorkOrderToggleNotes: workOrderActions.setWorkOrderToggleNotes,
    isDeleting: moderationActions.isDeleting,
    isTogglingWorkOrder: workOrderActions.isTogglingWorkOrder,
    isRejectDialogOpen: moderationActions.isRejectDialogOpen,
    setIsRejectDialogOpen: moderationActions.setIsRejectDialogOpen,
    setRowToDelete: moderationActions.setRowToDelete,
    rowToReject: moderationActions.rowToReject,
    setRowToReject: moderationActions.setRowToReject,
    isExecuteWorkOrderDialogOpen: workOrderActions.isExecuteWorkOrderDialogOpen,
    setIsExecuteWorkOrderDialogOpen:
      workOrderActions.setIsExecuteWorkOrderDialogOpen,
    rowToExecuteWorkOrder: workOrderActions.rowToExecuteWorkOrder,
    setRowToExecuteWorkOrder: workOrderActions.setRowToExecuteWorkOrder,
    rejectFeedback: moderationActions.rejectFeedback,
    setRejectFeedback: moderationActions.setRejectFeedback,
    isRejecting: moderationActions.isRejecting,
    isDialogDownloading,
    openWorkOrderToggleDialog: workOrderActions.openWorkOrderToggleDialog,
    handleConfirmWorkOrderToggle: workOrderActions.handleConfirmWorkOrderToggle,
    handleWorkOrderAction: workOrderActions.handleWorkOrderAction,
    handleApproveRequest: workOrderActions.handleApproveRequest,
    openExecuteWorkOrderDialog: workOrderActions.openExecuteWorkOrderDialog,
    handleConfirmExecuteWorkOrder:
      workOrderActions.handleConfirmExecuteWorkOrder,
    openRejectDialog: moderationActions.openRejectDialog,
    handleConfirmRejectRequest: moderationActions.handleConfirmRejectRequest,
    handleDeleteRequest: moderationActions.handleDeleteRequest,
    handleDialogDelete: moderationActions.handleDialogDelete,
    handleDialogResumeWorkOrder: workOrderActions.handleDialogResumeWorkOrder,
    handleDialogDownload
  };
};
