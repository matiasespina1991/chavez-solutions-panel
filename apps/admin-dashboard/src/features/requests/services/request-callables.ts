import { getFunctions, httpsCallable } from 'firebase/functions';

interface CreateWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
}

export const createWorkOrderFromRequest = async (
  sourceRequestId: string
): Promise<CreateWorkOrderResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { sourceRequestId: string },
    CreateWorkOrderResponse
  >(functions, 'createWorkOrder');

  try {
    const result = await callable({ sourceRequestId });
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
        'Service request must be approved before generating a work order.'
      )
    ) {
      throw new Error(
        'La proforma debe estar aprobada antes de emitir una orden de trabajo.'
      );
    }

    throw error;
  }
};

interface ApproveProformaResponse {
  requestId: string;
  approvalStatus: 'approved';
  alreadyApproved: boolean;
}

export const approveProforma = async (
  requestId: string,
  feedback?: string
): Promise<ApproveProformaResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { requestId: string; feedback?: string },
    ApproveProformaResponse
  >(functions, 'approveProforma');
  const result = await callable({ requestId, feedback });
  return result.data;
};

interface RejectProformaResponse {
  requestId: string;
  approvalStatus: 'rejected';
}

export const rejectProforma = async (
  requestId: string,
  feedback: string
): Promise<RejectProformaResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { requestId: string; feedback: string },
    RejectProformaResponse
  >(functions, 'rejectProforma');
  const result = await callable({ requestId, feedback });
  return result.data;
};

interface PauseWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
  status: 'paused';
}

export const pauseWorkOrderFromRequest = async (
  sourceRequestId: string,
  notes?: string
): Promise<PauseWorkOrderResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { sourceRequestId: string; notes?: string },
    PauseWorkOrderResponse
  >(functions, 'pauseWorkOrder');
  const result = await callable({ sourceRequestId, notes });
  return result.data;
};

interface ResumeWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
  status: 'issued';
}

export const resumeWorkOrderFromRequest = async (
  sourceRequestId: string,
  notes?: string
): Promise<ResumeWorkOrderResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { sourceRequestId: string; notes?: string },
    ResumeWorkOrderResponse
  >(functions, 'resumeWorkOrder');
  const result = await callable({ sourceRequestId, notes });
  return result.data;
};

interface DeleteProformaResponse {
  deletedRequestId: string;
}

export const deleteProforma = async (
  requestId: string
): Promise<DeleteProformaResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { requestId: string },
    DeleteProformaResponse
  >(functions, 'deleteProforma');
  const result = await callable({ requestId });
  return result.data;
};
