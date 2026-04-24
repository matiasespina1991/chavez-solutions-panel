import {
  getCallableErrorMeta,
  getGenericCallableErrorMessage
} from '@/lib/callable-errors';

export const getFriendlyRequestErrorMessage = (
  error: unknown,
  fallback: string
) => {
  const { code: errorCode, reason: errorReason, message: errorMessage } =
    getCallableErrorMeta(error);

  const genericErrorMessage = getGenericCallableErrorMessage(error);
  if (genericErrorMessage) {
    return genericErrorMessage;
  }

  if (errorReason === 'REQUEST_NOT_APPROVED') {
    return 'La proforma debe estar aprobada antes de emitir una orden de trabajo.';
  }

  if (errorReason === 'REQUEST_DRAFT_NOT_APPROVABLE') {
    return 'No se puede aprobar una solicitud en borrador.';
  }

  if (
    errorReason === 'REQUEST_NOT_APPROVABLE_STATUS' ||
    errorReason === 'REQUEST_NOT_EMITTABLE'
  ) {
    return 'No se puede aprobar esta solicitud en su estado actual.';
  }

  if (errorReason === 'REJECT_FEEDBACK_REQUIRED') {
    return 'Debe ingresar un motivo de rechazo.';
  }

  if (errorReason === 'REQUEST_NOT_REJECTABLE_STATUS') {
    return 'No se puede rechazar esta solicitud en su estado actual.';
  }

  if (errorReason === 'REQUEST_ONLY_SUBMITTED_REJECTABLE') {
    return 'Solo se pueden rechazar proformas enviadas.';
  }

  if (errorReason === 'REQUEST_NOT_FOUND' || errorCode === 'not-found') {
    return 'No se encontró la solicitud.';
  }

  if (errorReason === 'REQUEST_ID_REQUIRED' || errorCode === 'invalid-argument') {
    return 'Faltan datos requeridos para completar la acción.';
  }

  // Compatibilidad temporal con backends aún no desplegados con details.reason.
  if (
    errorMessage.includes(
      'Service request must be approved before generating a work order.'
    )
  ) {
    return 'La proforma debe estar aprobada antes de emitir una orden de trabajo.';
  }

  if (
    errorMessage.includes('Draft service requests cannot be approved.') ||
    errorMessage.includes('Draft proformas cannot be approved.')
  ) {
    return 'No se puede aprobar una solicitud en borrador.';
  }

  if (
    errorMessage.includes(
      'This service request cannot be approved in its current status.'
    ) ||
    errorMessage.includes('This proforma cannot be approved in its current status.')
  ) {
    return 'No se puede aprobar esta solicitud en su estado actual.';
  }

  if (
    errorMessage.includes('feedback is required to reject a service request.') ||
    errorMessage.includes('feedback is required to reject a proforma.')
  ) {
    return 'Debe ingresar un motivo de rechazo.';
  }

  if (
    errorMessage.includes(
      'This service request cannot be rejected in its current status.'
    ) ||
    errorMessage.includes('This proforma cannot be rejected in its current status.')
  ) {
    return 'No se puede rechazar esta solicitud en su estado actual.';
  }

  if (
    errorMessage.includes('Only submitted service requests can be rejected.') ||
    errorMessage.includes('Only submitted proformas can be rejected.')
  ) {
    return 'Solo se pueden rechazar proformas enviadas.';
  }

  return errorMessage || fallback;
};
