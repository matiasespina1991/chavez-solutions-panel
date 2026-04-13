import { getFunctions, httpsCallable } from 'firebase/functions';

interface ImportServicesFromCsvResponse {
  importedCount: number;
  deletedCount: number;
  fileName: string | null;
}

export interface ServiceHistoryEntry {
  id: string;
  createdAt: string | null;
  fileName: string | null;
  serviceCount: number;
  isCurrent: boolean;
}

export interface ListServiceHistoryResponse {
  entries: ServiceHistoryEntry[];
  currentHistoryId: string | null;
}

interface MatrixMigrationStats {
  updated: number;
  alreadyArray: number;
  invalidToEmpty: number;
  errors: number;
}

export interface MigrateMatrixToArrayResponse {
  service_requests: MatrixMigrationStats;
  work_orders: MatrixMigrationStats;
}

export interface SaveServicesTechnicalChange {
  id: string;
  patch: Record<string, string | number | null>;
  lastKnownUpdatedAt?: string | null;
}

export interface SaveServicesTechnicalChangesResponse {
  updated: number;
  skipped: number;
  notFound: string[];
  conflicts: string[];
  invalid: string[];
  auditId: string;
}

export const importServicesFromCsv = async (
  csvContent: string,
  fileName?: string
): Promise<ImportServicesFromCsvResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { csvContent: string; fileName?: string },
    ImportServicesFromCsvResponse
  >(functions, 'importServicesFromCsv');

  const result = await callable({ csvContent, fileName });
  return result.data;
};

export const listServiceHistory =
  async (): Promise<ListServiceHistoryResponse> => {
    const functions = getFunctions();
    const callable = httpsCallable<{}, ListServiceHistoryResponse>(
      functions,
      'listServiceHistory'
    );

    const result = await callable({});
    return result.data;
  };

export const restoreServiceHistory = async (
  historyId: string
): Promise<{ restoredId: string; restoredCount: number }> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { historyId: string },
    { restoredId: string; restoredCount: number }
  >(functions, 'restoreServiceHistory');

  const result = await callable({ historyId });
  return result.data;
};

export const deleteServiceHistory = async (
  historyId: string
): Promise<{ deletedId: string }> => {
  const functions = getFunctions();
  const callable = httpsCallable<{ historyId: string }, { deletedId: string }>(
    functions,
    'deleteServiceHistory'
  );

  const result = await callable({ historyId });
  return result.data;
};

export const saveServicesTechnicalChanges = async (
  changes: SaveServicesTechnicalChange[],
  reason?: string
): Promise<SaveServicesTechnicalChangesResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { changes: SaveServicesTechnicalChange[]; reason?: string },
    SaveServicesTechnicalChangesResponse
  >(functions, 'saveServicesTechnicalChanges');

  const result = await callable({ changes, reason });
  return result.data;
};
