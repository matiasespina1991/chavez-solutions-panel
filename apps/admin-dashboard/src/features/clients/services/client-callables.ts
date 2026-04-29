import { getFunctions, httpsCallable } from 'firebase/functions';
import type { ClientDraft } from '@/features/clients/lib/client-panel-model';

export interface SaveClientChange {
  id: string;
  patch: Record<string, string | null>;
  lastKnownUpdatedAt?: string | null;
}

export interface SaveClientChangesResponse {
  updated: number;
  skipped: number;
  notFound: string[];
  conflicts: string[];
  invalid: string[];
}

export interface BackfillClientsFromRequestsResponse {
  importedCount: number;
  skippedExisting: number;
  skippedInvalid: number;
}

export const createClient = async (
  payload: ClientDraft
): Promise<{ id: string }> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { payload: ClientDraft },
    { id: string }
  >(functions, 'createClient');

  const result = await callable({ payload });
  return result.data;
};

export const saveClientChanges = async (
  changes: SaveClientChange[],
  reason?: string
): Promise<SaveClientChangesResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { changes: SaveClientChange[]; reason?: string },
    SaveClientChangesResponse
  >(functions, 'saveClientChanges');

  const result = await callable({ changes, reason });
  return result.data;
};

export const deleteClient = async (
  id: string
): Promise<{ deletedId: string }> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { id: string },
    { deletedId: string }
  >(functions, 'deleteClient');

  const result = await callable({ id });
  return result.data;
};

export const backfillClientsFromRequests =
  async (): Promise<BackfillClientsFromRequestsResponse> => {
    const functions = getFunctions();
    const callable = httpsCallable<
      Record<string, never>,
      BackfillClientsFromRequestsResponse
    >(functions, 'backfillClientsFromRequests');

    const result = await callable({});
    return result.data;
  };
