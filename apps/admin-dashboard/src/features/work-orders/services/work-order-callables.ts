import { getCallableErrorMeta } from '@/lib/callable-errors';
import { callFirebaseCallable } from '@/lib/firebase-callable';

interface CompleteWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
  sourceRequestId: string;
  status: 'completed';
}

export const completeWorkOrder = async (
  workOrderId: string,
  sourceRequestId?: string
): Promise<CompleteWorkOrderResponse> => {
  try {
    return await callFirebaseCallable<
      { workOrderId: string; sourceRequestId?: string },
      CompleteWorkOrderResponse
    >('completeWorkOrder', { workOrderId, sourceRequestId });
  } catch (error) {
    const { code, reason } = getCallableErrorMeta(error);

    if (reason === 'LAB_ANALYSIS_REQUIRED_BEFORE_COMPLETION') {
      throw new Error(
        'Debe registrar análisis de laboratorio antes de finalizar la orden de trabajo.'
      );
    }

    if (reason === 'WORK_ORDER_NOT_FOUND' || code === 'not-found') {
      throw new Error('No se encontró la orden de trabajo seleccionada.');
    }

    if (reason === 'WORK_ORDER_IDENTIFIER_REQUIRED' || code === 'invalid-argument') {
      throw new Error('Faltan datos requeridos para completar la acción.');
    }

    throw error;
  }
};
