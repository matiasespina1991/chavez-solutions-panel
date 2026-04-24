import { completeWorkOrder } from '@/features/work-orders/services/work-order-actions';
import { getGenericCallableErrorMessage } from '@/lib/callable-errors';
import { showCallableErrorToast } from '@/lib/callable-toast';
import {
  downloadWorkOrderSummary,
  printWorkOrderSummary
} from '@/features/work-orders/lib/work-order-preview';
import type { WorkOrderListRow as WorkOrderRow } from '@/types/domain';
import { useState } from 'react';
import { toast } from 'sonner';

interface UseWorkOrderActionsParams {
  selectedRow: WorkOrderRow | null;
}

export function useWorkOrderActions({ selectedRow }: UseWorkOrderActionsParams) {
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [rowToComplete, setRowToComplete] = useState<WorkOrderRow | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleConfirmCompleteWorkOrder = async () => {
    if (!rowToComplete) return;

    try {
      setIsCompleting(true);
      setPendingActionId(rowToComplete.id);
      await completeWorkOrder(rowToComplete.id, rowToComplete.sourceRequestId);
      toast.success(`Orden de trabajo ${rowToComplete.workOrderNumber} finalizada`);
      setIsCompleteDialogOpen(false);
      setRowToComplete(null);
    } catch (error) {
      console.error('[WorkOrders] complete action error', error);
      const genericErrorMessage = getGenericCallableErrorMessage(error);
      const fallbackMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'No se pudo finalizar la orden de trabajo';
      showCallableErrorToast(genericErrorMessage ?? fallbackMessage);
    } finally {
      setIsCompleting(false);
      setPendingActionId(null);
    }
  };

  const handleDialogDownload = () => {
    if (!selectedRow) return;
    downloadWorkOrderSummary(selectedRow);
    toast.success('Resumen descargado correctamente');
  };

  const handleDialogPrint = () => {
    if (!selectedRow) return;
    const printed = printWorkOrderSummary(selectedRow);
    if (!printed) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }

    toast.success('Abriendo vista de impresión…');
  };

  return {
    pendingActionId,
    isCompleteDialogOpen,
    setIsCompleteDialogOpen,
    rowToComplete,
    setRowToComplete,
    isCompleting,
    handleConfirmCompleteWorkOrder,
    handleDialogDownload,
    handleDialogPrint
  };
}
