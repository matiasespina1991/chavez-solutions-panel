import { callFirebaseCallable } from '@/lib/firebase-callable';

interface CreateWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
}

export const createWorkOrderFromRequest = async (
  sourceRequestId: string
): Promise<CreateWorkOrderResponse> => callFirebaseCallable<
  { sourceRequestId: string },
  CreateWorkOrderResponse
>('createWorkOrder', { sourceRequestId });

interface ApproveProformaResponse {
  requestId: string;
  approvalStatus: 'approved';
  alreadyApproved: boolean;
}

export const approveProforma = async (
  requestId: string,
  feedback?: string
): Promise<ApproveProformaResponse> => callFirebaseCallable<
  { requestId: string; feedback?: string },
  ApproveProformaResponse
>('approveProforma', { requestId, feedback });

interface RejectProformaResponse {
  requestId: string;
  approvalStatus: 'rejected';
}

export const rejectProforma = async (
  requestId: string,
  feedback: string
): Promise<RejectProformaResponse> => callFirebaseCallable<
  { requestId: string; feedback: string },
  RejectProformaResponse
>('rejectProforma', { requestId, feedback });

interface PauseWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
  status: 'paused';
}

export const pauseWorkOrderFromRequest = async (
  sourceRequestId: string,
  notes?: string
): Promise<PauseWorkOrderResponse> => callFirebaseCallable<
  { sourceRequestId: string; notes?: string },
  PauseWorkOrderResponse
>('pauseWorkOrder', { sourceRequestId, notes });

interface ResumeWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
  status: 'issued';
}

export const resumeWorkOrderFromRequest = async (
  sourceRequestId: string,
  notes?: string
): Promise<ResumeWorkOrderResponse> => callFirebaseCallable<
  { sourceRequestId: string; notes?: string },
  ResumeWorkOrderResponse
>('resumeWorkOrder', { sourceRequestId, notes });

interface DeleteProformaResponse {
  deletedRequestId: string;
}

export const deleteProforma = async (
  requestId: string
): Promise<DeleteProformaResponse> => callFirebaseCallable<
  { requestId: string },
  DeleteProformaResponse
>('deleteProforma', { requestId });
