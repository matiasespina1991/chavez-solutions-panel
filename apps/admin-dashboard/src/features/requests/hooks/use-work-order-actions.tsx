import {
  approveProforma,
  createWorkOrderFromRequest,
  pauseWorkOrderFromRequest,
  resumeWorkOrderFromRequest
} from '@/features/requests/services/request-actions';
import { getFriendlyRequestErrorMessage } from '@/features/requests/lib/request-errors';
import { hasIssuedWorkOrder } from '@/features/requests/lib/request-status';
import { showCallableErrorToast } from '@/lib/callable-toast';
import { auth } from '@/lib/firebase';
import type {
  RequestListRow as RequestRow,
  RequestStatus
} from '@/types/domain';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';

interface UseWorkOrderActionsParams {
  selectedRow: RequestRow | null;
  setRows: Dispatch<SetStateAction<RequestRow[]>>;
  setSelectedRow: Dispatch<SetStateAction<RequestRow | null>>;
  setPendingActionId: Dispatch<SetStateAction<string | null>>;
}

interface UseWorkOrderActionsResult {
  isWorkOrderToggleDialogOpen: boolean;
  setIsWorkOrderToggleDialogOpen: Dispatch<SetStateAction<boolean>>;
  rowToToggleWorkOrder: RequestRow | null;
  setRowToToggleWorkOrder: Dispatch<SetStateAction<RequestRow | null>>;
  workOrderToggleAction: 'pause' | 'resume' | null;
  setWorkOrderToggleAction: Dispatch<SetStateAction<'pause' | 'resume' | null>>;
  workOrderToggleNotes: string;
  setWorkOrderToggleNotes: Dispatch<SetStateAction<string>>;
  isTogglingWorkOrder: boolean;
  isExecuteWorkOrderDialogOpen: boolean;
  setIsExecuteWorkOrderDialogOpen: Dispatch<SetStateAction<boolean>>;
  rowToExecuteWorkOrder: RequestRow | null;
  setRowToExecuteWorkOrder: Dispatch<SetStateAction<RequestRow | null>>;
  openWorkOrderToggleDialog: (row: RequestRow) => void;
  handleConfirmWorkOrderToggle: () => Promise<void>;
  handleWorkOrderAction: (row: RequestRow) => Promise<void>;
  handleApproveRequest: (row: RequestRow) => Promise<void>;
  openExecuteWorkOrderDialog: (row: RequestRow) => void;
  handleConfirmExecuteWorkOrder: () => Promise<void>;
  handleDialogResumeWorkOrder: () => void;
}

export const useWorkOrderActions = ({
  selectedRow,
  setRows,
  setSelectedRow,
  setPendingActionId
}: UseWorkOrderActionsParams): UseWorkOrderActionsResult => {
  const [isWorkOrderToggleDialogOpen, setIsWorkOrderToggleDialogOpen] =
    useState(false);
  const [rowToToggleWorkOrder, setRowToToggleWorkOrder] =
    useState<RequestRow | null>(null);
  const [workOrderToggleAction, setWorkOrderToggleAction] = useState<
    'pause' | 'resume' | null
  >(null);
  const [isTogglingWorkOrder, setIsTogglingWorkOrder] = useState(false);
  const [workOrderToggleNotes, setWorkOrderToggleNotes] = useState('');
  const [isExecuteWorkOrderDialogOpen, setIsExecuteWorkOrderDialogOpen] =
    useState(false);
  const [rowToExecuteWorkOrder, setRowToExecuteWorkOrder] =
    useState<RequestRow | null>(null);

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

  const handleDialogResumeWorkOrder = () => {
    if (!selectedRow || selectedRow.status !== 'work_order_paused') return;
    openWorkOrderToggleDialog(selectedRow);
  };

  return {
    isWorkOrderToggleDialogOpen,
    setIsWorkOrderToggleDialogOpen,
    rowToToggleWorkOrder,
    setRowToToggleWorkOrder,
    workOrderToggleAction,
    setWorkOrderToggleAction,
    workOrderToggleNotes,
    setWorkOrderToggleNotes,
    isTogglingWorkOrder,
    isExecuteWorkOrderDialogOpen,
    setIsExecuteWorkOrderDialogOpen,
    rowToExecuteWorkOrder,
    setRowToExecuteWorkOrder,
    openWorkOrderToggleDialog,
    handleConfirmWorkOrderToggle,
    handleWorkOrderAction,
    handleApproveRequest,
    openExecuteWorkOrderDialog,
    handleConfirmExecuteWorkOrder,
    handleDialogResumeWorkOrder
  };
};
