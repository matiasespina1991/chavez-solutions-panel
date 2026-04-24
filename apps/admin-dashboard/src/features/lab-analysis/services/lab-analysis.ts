import { getFunctions, httpsCallable } from 'firebase/functions';
import { SaveLabAnalysisRowInput } from '@/features/lab-analysis/lib/lab-analysis-model';

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
  const functions = getFunctions();
  const callable = httpsCallable<
    {
      workOrderId: string;
      analyses: SaveLabAnalysisRowInput[];
      notes?: string;
    },
    SaveWorkOrderLabAnalysisResponse
  >(functions, 'saveWorkOrderLabAnalysis');

  try {
    const result = await callable({
      workOrderId,
      analyses,
      notes
    });

    return result.data;
  } catch (error) {
    const errorMessage =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : '';

    if (errorMessage.includes('Work order not found.')) {
      throw new Error('No se encontró la orden de trabajo seleccionada.');
    }

    if (errorMessage.includes('cancelled work order')) {
      throw new Error('No se pueden registrar análisis para una OT cancelada.');
    }

    if (
      errorMessage.includes(
        'At least one analysis with parameter and result is required.'
      )
    ) {
      throw new Error(
        'Debe ingresar al menos un análisis con parámetro y resultado.'
      );
    }

    throw error;
  }
};
