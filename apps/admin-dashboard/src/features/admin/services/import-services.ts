import { getFunctions, httpsCallable } from 'firebase/functions';

interface ImportServicesFromCsvResponse {
  importedCount: number;
  deletedCount: number;
  fileName: string | null;
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
