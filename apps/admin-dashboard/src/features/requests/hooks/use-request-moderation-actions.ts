import {
  deleteProforma,
  rejectProforma
} from '@/features/requests/services/request-actions';
import { getFriendlyRequestErrorMessage } from '@/features/requests/lib/request-errors';
import { showCallableErrorToast } from '@/lib/callable-toast';
import type { RequestListRow as RequestRow } from '@/types/domain';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';

interface UseRequestModerationActionsParams {
  selectedRow: RequestRow | null;
  setRows: Dispatch<SetStateAction<RequestRow[]>>;
  setSelectedRow: Dispatch<SetStateAction<RequestRow | null>>;
  setPendingActionId: Dispatch<SetStateAction<string | null>>;
  onCloseSummaryDialog: () => void;
}

interface UseRequestModerationActionsResult {
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  setRowToDelete: Dispatch<SetStateAction<RequestRow | null>>;
  isDeleting: boolean;
  isRejectDialogOpen: boolean;
  setIsRejectDialogOpen: Dispatch<SetStateAction<boolean>>;
  rowToReject: RequestRow | null;
  setRowToReject: Dispatch<SetStateAction<RequestRow | null>>;
  rejectFeedback: string;
  setRejectFeedback: Dispatch<SetStateAction<string>>;
  isRejecting: boolean;
  openRejectDialog: (row: RequestRow) => void;
  handleConfirmRejectRequest: () => Promise<void>;
  handleDeleteRequest: () => Promise<void>;
  handleDialogDelete: () => void;
}

export const useRequestModerationActions = ({
  selectedRow,
  setRows,
  setSelectedRow,
  setPendingActionId,
  onCloseSummaryDialog
}: UseRequestModerationActionsParams): UseRequestModerationActionsResult => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<RequestRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rowToReject, setRowToReject] = useState<RequestRow | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const openRejectDialog = (row: RequestRow) => {
    setRowToReject(row);
    setRejectFeedback(row.approvalFeedback || '');
    setIsRejectDialogOpen(true);
  };

  const handleConfirmRejectRequest = async () => {
    if (!rowToReject) return;

    const feedback = rejectFeedback.trim();

    if (!feedback) {
      toast.error('Debe ingresar un motivo de rechazo.');
      return;
    }

    try {
      setIsRejecting(true);
      setPendingActionId(rowToReject.id);

      await rejectProforma(rowToReject.id, feedback);

      toast.success(`Proforma ${rowToReject.reference} rechazada`);

      setRows((prev) =>
        prev.map((entry) =>
          entry.id === rowToReject.id
            ? {
                ...entry,
                status: 'draft',
                approvalStatus: 'rejected',
                approvalFeedback: feedback
              }
            : entry
        )
      );

      setSelectedRow((prev) =>
        prev && prev.id === rowToReject.id
          ? {
              ...prev,
              status: 'draft',
              approvalStatus: 'rejected',
              approvalFeedback: feedback
            }
          : prev
      );

      setIsRejectDialogOpen(false);
      setRowToReject(null);
      setRejectFeedback('');
    } catch (error) {
      console.error('[Requests] reject error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(error, 'No se pudo rechazar la proforma')
      );
    } finally {
      setIsRejecting(false);
      setPendingActionId(null);
    }
  };

  const handleDeleteRequest = async () => {
    if (!rowToDelete) return;

    try {
      setIsDeleting(true);
      await deleteProforma(rowToDelete.id);
      toast.success('Solicitud eliminada correctamente');
      setIsDeleteDialogOpen(false);
      setRowToDelete(null);
      if (selectedRow?.id === rowToDelete.id) {
        onCloseSummaryDialog();
        setSelectedRow(null);
      }
    } catch (error) {
      console.error('[Requests] delete error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(error, 'No se pudo eliminar la solicitud')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDialogDelete = () => {
    if (!selectedRow) return;
    setRowToDelete(selectedRow);
    setIsDeleteDialogOpen(true);
  };

  return {
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    setRowToDelete,
    isDeleting,
    isRejectDialogOpen,
    setIsRejectDialogOpen,
    rowToReject,
    setRowToReject,
    rejectFeedback,
    setRejectFeedback,
    isRejecting,
    openRejectDialog,
    handleConfirmRejectRequest,
    handleDeleteRequest,
    handleDialogDelete
  };
};
