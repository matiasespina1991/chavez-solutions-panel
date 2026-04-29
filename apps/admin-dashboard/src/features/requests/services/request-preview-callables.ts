import { callFirebaseCallable } from '@/lib/firebase-callable';

export interface ProformaPreviewPdfServiceLine {
  table: string;
  label: string;
  unit: string;
  method: string;
  rangeOffered: string;
  quantity: number;
  unitPrice: number | null;
  discountAmount: number | null;
  subtotal: number | null;
}

export interface ProformaPreviewPdfServiceGroup {
  name: string;
  items: ProformaPreviewPdfServiceLine[];
}

export interface ProformaPreviewPdfPayload {
  reference: string;
  matrixLabels: string[];
  validDays: number | null;
  issuedAtLabel: string;
  validUntilLabel: string;
  client: {
    businessName: string;
    taxId: string;
    contactName: string;
    address: string;
    city: string;
    email: string;
    phone: string;
    mobile?: string;
  };
  services: ProformaPreviewPdfServiceLine[];
  serviceGroups?: ProformaPreviewPdfServiceGroup[];
  pricing: {
    subtotal: number;
    taxPercent: number;
    total: number;
  };
}

export interface ProformaPreviewLineSource {
  tableLabel?: string | null;
  label?: string | null;
  parameterId?: string | null;
  unit?: string | null;
  method?: string | null;
  rangeMin?: string | null;
  rangeMax?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  discountAmount?: number | null;
}

export const toProformaPreviewServiceLine = (
  source: ProformaPreviewLineSource
): ProformaPreviewPdfServiceLine => {
  const quantity =
    typeof source.quantity === 'number' && Number.isFinite(source.quantity)
      ? Math.max(0, source.quantity)
      : 0;
  const unitPrice =
    typeof source.unitPrice === 'number' && Number.isFinite(source.unitPrice)
      ? source.unitPrice
      : null;
  const discountAmount =
    typeof source.discountAmount === 'number' &&
    Number.isFinite(source.discountAmount)
      ? source.discountAmount
      : null;
  const subtotal =
    unitPrice !== null
      ? Math.max(0, quantity * unitPrice - (discountAmount ?? 0))
      : null;

  return {
    table: source.tableLabel || 'Sin tabla',
    label: source.label || source.parameterId || 'Servicio',
    unit: source.unit || 'Sin unidad',
    method: source.method || 'Sin método',
    rangeOffered: `${source.rangeMin || '—'} a ${source.rangeMax || '—'}`,
    quantity,
    unitPrice,
    discountAmount,
    subtotal
  };
};

interface GenerateProformaPreviewPdfResponse {
  storagePath: string;
  downloadURL: string;
  fileName: string;
}

export const generateProformaPreviewPdf = async (
  payload: ProformaPreviewPdfPayload
): Promise<GenerateProformaPreviewPdfResponse> => {
  return callFirebaseCallable<
    { payload: ProformaPreviewPdfPayload },
    GenerateProformaPreviewPdfResponse
  >('generateProformaPreviewPdf', { payload });
};

interface SendProformaPreviewEmailResponse {
  sent: boolean;
  to: string;
  storagePath: string;
  downloadURL: string;
  fileName: string;
}

export const sendProformaPreviewEmail = async (params: {
  to: string;
  payload: ProformaPreviewPdfPayload;
  subject?: string;
  text?: string;
}): Promise<SendProformaPreviewEmailResponse> => {
  return callFirebaseCallable<
    {
      to: string;
      payload: ProformaPreviewPdfPayload;
      subject?: string;
      text?: string;
    },
    SendProformaPreviewEmailResponse
  >('sendProformaPreviewEmail', params);
};
