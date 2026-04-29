import { getFunctions, httpsCallable } from 'firebase/functions';

const FUNCTIONS_REGION = 'us-central1';

export const callFirebaseCallable = async <TRequest, TResponse>(
  callableName: string,
  payload: TRequest
): Promise<TResponse> => {
  const functions = getFunctions(undefined, FUNCTIONS_REGION);
  const callable = httpsCallable<TRequest, TResponse>(functions, callableName);
  const result = await callable(payload);
  return result.data;
};
