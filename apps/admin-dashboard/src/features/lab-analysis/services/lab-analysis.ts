import { SaveLabAnalysisRowInput } from '@/features/lab-analysis/lib/lab-analysis-model';
import { getCallableErrorMeta } from '@/lib/callable-errors';
import { callFirebaseCallable } from '@/lib/firebase-callable';

interface SaveWorkOrderLabAnalysisResponse {
  workOrderId: string;
  workOrderNumber: string;
  savedCount: number;
  status: 'recorded';
}

export const saveWorkOrderLabAnalysis = async (
  workOrderId: string,
  analyses: SaveLabAnalysisRowInput[],
  notes?: string
): Promise<SaveWorkOrderLabAnalysisResponse> => {
  try {
    return await callFirebaseCallable<
      {
        workOrderId: string;
        analyses: SaveLabAnalysisRowInput[];
        notes?: string;
      },
      SaveWorkOrderLabAnalysisResponse
    >('saveWorkOrderLabAnalysis', {
      workOrderId,
      analyses,
      notes
    });
  } catch (error) {
    const { code, reason } = getCallableErrorMeta(error);

    if (reason === 'WORK_ORDER_NOT_FOUND' || code === 'not-found') {
      throw new Error('No se encontró la orden de trabajo seleccionada.');
    }

    if (reason === 'WORK_ORDER_CANCELLED' || code === 'failed-precondition') {
      throw new Error('No se pueden registrar análisis para una OT cancelada.');
    }

    if (
      reason === 'LAB_ANALYSIS_MINIMUM_REQUIRED' ||
      reason === 'WORK_ORDER_ID_REQUIRED' ||
      code === 'invalid-argument'
    ) {
      throw new Error(
        'Debe ingresar al menos un análisis con parámetro y resultado.'
      );
    }

    throw error;
  }
};
