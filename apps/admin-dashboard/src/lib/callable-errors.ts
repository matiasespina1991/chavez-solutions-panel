export interface CallableErrorMeta {
  code: string;
  reason: string;
  message: string;
}

export const PERMISSION_DENIED_TOAST_MESSAGE =
  'No tienes permisos para realizar esta acción.';

export const getCallableErrorMeta = (error: unknown): CallableErrorMeta => {
  const code =
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code.replace(/^functions\//, '')
      : '';

  const reason =
    error &&
    typeof error === 'object' &&
    'details' in error &&
    typeof error.details === 'object' &&
    error.details !== null &&
    'reason' in error.details &&
    typeof error.details.reason === 'string'
      ? error.details.reason
      : '';

  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : '';

  return { code, reason, message };
};

export const getGenericCallableErrorMessage = (error: unknown): string | null => {
  const { code } = getCallableErrorMeta(error);

  if (code === 'permission-denied') {
    return PERMISSION_DENIED_TOAST_MESSAGE;
  }

  if (code === 'unauthenticated') {
    return 'Debes iniciar sesión para realizar esta acción.';
  }

  return null;
};
