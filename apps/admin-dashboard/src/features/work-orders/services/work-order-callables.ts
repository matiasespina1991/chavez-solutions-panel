import { getFunctions, httpsCallable } from 'firebase/functions';

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
  const functions = getFunctions();
  const callable = httpsCallable<
    { workOrderId: string; sourceRequestId?: string },
    CompleteWorkOrderResponse
  >(functions, 'completeWorkOrder');

  try {
    const result = await callable({ workOrderId, sourceRequestId });
    return result.data;
  } catch (error) {
    const errorMessage =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : '';

    if (
      errorMessage.includes(
        'Lab analysis must be recorded before completing a work order.'
      )
    ) {
      throw new Error(
        'Debe registrar análisis de laboratorio antes de finalizar la orden de trabajo.'
      );
    }

    throw error;
  }
};
