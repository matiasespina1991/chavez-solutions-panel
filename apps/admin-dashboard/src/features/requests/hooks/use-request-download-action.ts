import {
  generateProformaPreviewPdf,
  toProformaPreviewServiceLine
} from '@/features/configurator/services/configurations';
import { getFriendlyRequestErrorMessage } from '@/features/requests/lib/request-errors';
import { buildProformaPreviewPayloadFromRequestRow } from '@/features/requests/lib/request-preview';
import { showCallableErrorToast } from '@/lib/callable-toast';
import type { RequestListRow as RequestRow } from '@/types/domain';
import { useState } from 'react';
import { toast } from 'sonner';

interface UseRequestDownloadActionResult {
  isDialogDownloading: boolean;
  handleDialogDownload: () => Promise<void>;
}

export const useRequestDownloadAction = (
  selectedRow: RequestRow | null
): UseRequestDownloadActionResult => {
  const [isDialogDownloading, setIsDialogDownloading] = useState(false);

  const handleDialogDownload = async () => {
    if (!selectedRow) return;

    try {
      setIsDialogDownloading(true);
      const result = await generateProformaPreviewPdf(
        buildProformaPreviewPayloadFromRequestRow(
          selectedRow,
          toProformaPreviewServiceLine
        )
      );

      const link = document.createElement('a');
      link.href = result.downloadURL;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF de proforma descargado.');
    } catch (error) {
      console.error('[Requests] download pdf error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(
          error,
          'No se pudo descargar el PDF de la proforma.'
        )
      );
    } finally {
      setIsDialogDownloading(false);
    }
  };

  return {
    isDialogDownloading,
    handleDialogDownload
  };
};
