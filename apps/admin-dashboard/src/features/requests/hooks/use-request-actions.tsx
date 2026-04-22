import {
  approveProforma,
  createWorkOrderFromRequest,
  deleteProforma,
  generateProformaPreviewPdf,
  pauseWorkOrderFromRequest,
  rejectProforma,
  resumeWorkOrderFromRequest,
  toProformaPreviewServiceLine
} from '@/features/configurator/services/configurations';
import { auth } from '@/lib/firebase';
import { showCallableErrorToast } from '@/lib/callable-toast';
import { getFriendlyRequestErrorMessage } from '@/features/requests/lib/request-errors';
import { buildProformaPreviewPayloadFromRequestRow } from '@/features/requests/lib/request-preview';
import { hasIssuedWorkOrder } from '@/features/requests/lib/request-status';
import type {
  RequestListRow as RequestRow,
  RequestStatus
} from '@/types/domain';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isWorkOrderToggleDialogOpen, setIsWorkOrderToggleDialogOpen] =
    useState(false);
  const [rowToToggleWorkOrder, setRowToToggleWorkOrder] =
    useState<RequestRow | null>(null);
  const [workOrderToggleAction, setWorkOrderToggleAction] = useState<
    'pause' | 'resume' | null
  >(null);
  const [rowToDelete, setRowToDelete] = useState<RequestRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingWorkOrder, setIsTogglingWorkOrder] = useState(false);
  const [workOrderToggleNotes, setWorkOrderToggleNotes] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rowToReject, setRowToReject] = useState<RequestRow | null>(null);
  const [isExecuteWorkOrderDialogOpen, setIsExecuteWorkOrderDialogOpen] =
    useState(false);
  const [rowToExecuteWorkOrder, setRowToExecuteWorkOrder] =
    useState<RequestRow | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDialogDownloading, setIsDialogDownloading] = useState(false);

  const openWorkOrderToggleDialog = (row: RequestRow) => {
    const workOrderIssued = hasIssuedWorkOrder(row);
    if (!workOrderIssued) return;

    const nextAction = row.status === 'work_order_paused' ? 'resume' : 'pause';
    setRowToToggleWorkOrder(row);
    setWorkOrderToggleAction(nextAction);
    setWorkOrderToggleNotes(row.notes || '');
    setIsWorkOrderToggleDialogOpen(true);
  };

  const handleConfirmWorkOrderToggle = async () => {
    if (!rowToToggleWorkOrder || !workOrderToggleAction) return;

    try {
      setIsTogglingWorkOrder(true);
      setPendingActionId(rowToToggleWorkOrder.id);

      const nextStatus: RequestStatus =
        workOrderToggleAction === 'resume'
          ? 'converted_to_work_order'
          : 'work_order_paused';

      if (workOrderToggleAction === 'resume') {
        await resumeWorkOrderFromRequest(
          rowToToggleWorkOrder.id,
          workOrderToggleNotes
        );
        toast.success(
          `Orden de trabajo ${rowToToggleWorkOrder.reference} reanudada`
        );
      } else {
        await pauseWorkOrderFromRequest(
          rowToToggleWorkOrder.id,
          workOrderToggleNotes
        );
        toast.success(
          `Orden de trabajo ${rowToToggleWorkOrder.reference} pausada`
        );
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === rowToToggleWorkOrder.id
            ? {
                ...row,
                status: nextStatus,
                notes: workOrderToggleNotes
              }
            : row
        )
      );

      setSelectedRow((prev) =>
        prev && prev.id === rowToToggleWorkOrder.id
          ? {
              ...prev,
              status: nextStatus,
              notes: workOrderToggleNotes
            }
          : prev
      );

      setIsWorkOrderToggleDialogOpen(false);
      setRowToToggleWorkOrder(null);
      setWorkOrderToggleAction(null);
      setWorkOrderToggleNotes('');
    } catch (error) {
      console.error('[Requests] toggle action error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(error, 'No se pudo completar la acción.')
      );
    } finally {
      setIsTogglingWorkOrder(false);
      setPendingActionId(null);
    }
  };

  const handleWorkOrderAction = async (row: RequestRow) => {
    if (row.status === 'draft') {
      toast.error('No se puede emitir una orden de trabajo desde un borrador');
      return;
    }

    if (row.status === 'work_order_completed') {
      toast.error('La orden de trabajo ya se encuentra finalizada');
      return;
    }

    try {
      setPendingActionId(row.id);

      const workOrderIssued = hasIssuedWorkOrder(row);

      if (workOrderIssued) {
        openWorkOrderToggleDialog(row);
        return;
      }

      await createWorkOrderFromRequest(row.id);
      toast.success(`Orden de Trabajo emitida (${row.reference})`, {
        icon: <IconCircleCheckFilled className='h-4 w-4 text-emerald-600' />
      });
    } catch (error) {
      console.error('[Requests] action error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(
          error,
          'No se pudo completar la acción de la orden de trabajo'
        )
      );
    } finally {
      setPendingActionId(null);
    }
  };

  const handleApproveRequest = async (row: RequestRow) => {
    try {
      setPendingActionId(row.id);
      await approveProforma(row.id);
      await createWorkOrderFromRequest(row.id);

      toast.success(`Orden de trabajo ejecutada (${row.reference})`);
      const approverEmail = auth.currentUser?.email?.trim() || null;

      setRows((prev) =>
        prev.map((entry) =>
          entry.id === row.id
            ? {
                ...entry,
                status: 'converted_to_work_order',
                approvalStatus: 'approved',
                approvalActorEmail: approverEmail,
                isWorkOrder: true
              }
            : entry
        )
      );

      setSelectedRow((prev) =>
        prev && prev.id === row.id
          ? {
              ...prev,
              status: 'converted_to_work_order',
              approvalStatus: 'approved',
              approvalActorEmail: approverEmail,
              isWorkOrder: true
            }
          : prev
      );
    } catch (error) {
      console.error('[Requests] approve error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(
          error,
          'No se pudo ejecutar la orden de trabajo'
        )
      );
    } finally {
      setPendingActionId(null);
    }
  };

  const openExecuteWorkOrderDialog = (row: RequestRow) => {
    setRowToExecuteWorkOrder(row);
    setIsExecuteWorkOrderDialogOpen(true);
  };

  const handleConfirmExecuteWorkOrder = async () => {
    if (!rowToExecuteWorkOrder) return;
    await handleApproveRequest(rowToExecuteWorkOrder);
    setIsExecuteWorkOrderDialogOpen(false);
    setRowToExecuteWorkOrder(null);
  };

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

  const handleDialogResumeWorkOrder = () => {
    if (!selectedRow || selectedRow.status !== 'work_order_paused') return;
    openWorkOrderToggleDialog(selectedRow);
  };

  const handleDialogDownload = async () => {
    if (!selectedRow) return;

    try {
      setIsDialogDownloading(true);
      const result = await generateProformaPreviewPdf(
        buildProformaPreviewPayloadFromRequestRow(
          selectedRow,
          toProformaPreviewServiceLine
        )
      );

      const link = document.createElement('a');
      link.href = result.downloadURL;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF de proforma descargado.');
    } catch (error) {
      console.error('[Requests] download pdf error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(
          error,
          'No se pudo descargar el PDF de la proforma.'
        )
      );
    } finally {
      setIsDialogDownloading(false);
    }
  };

  return {
    pendingActionId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isWorkOrderToggleDialogOpen,
    setIsWorkOrderToggleDialogOpen,
    rowToToggleWorkOrder,
    setRowToToggleWorkOrder,
    workOrderToggleAction,
    setWorkOrderToggleAction,
    workOrderToggleNotes,
    setWorkOrderToggleNotes,
    isDeleting,
    isTogglingWorkOrder,
    isRejectDialogOpen,
    setIsRejectDialogOpen,
    setRowToDelete,
    rowToReject,
    setRowToReject,
    isExecuteWorkOrderDialogOpen,
    setIsExecuteWorkOrderDialogOpen,
    rowToExecuteWorkOrder,
    setRowToExecuteWorkOrder,
    rejectFeedback,
    setRejectFeedback,
    isRejecting,
    isDialogDownloading,
    openWorkOrderToggleDialog,
    handleConfirmWorkOrderToggle,
    handleWorkOrderAction,
    handleApproveRequest,
    openExecuteWorkOrderDialog,
    handleConfirmExecuteWorkOrder,
    openRejectDialog,
    handleConfirmRejectRequest,
    handleDeleteRequest,
    handleDialogDelete,
    handleDialogResumeWorkOrder,
    handleDialogDownload
  };
};
