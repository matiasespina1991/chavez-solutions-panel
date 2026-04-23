import { firestoreTimestampToMs, formatFirestoreTimestamp } from '@/lib/firestore-timestamps';
import { normalizeMatrixArray } from '@/lib/request-normalizers';
import type { RequestServiceItem, WorkOrderListRow as WorkOrderRow, WorkOrderStatus } from '@/types/domain';

const normalizeRequestServiceItems = (raw: unknown[]): RequestServiceItem[] => {
  return raw.map((item, index) => {
    const rowItem = item as {
      serviceId?: string;
      parameterId?: string;
      parameterLabel?: string;
      tableLabel?: string | null;
      unit?: string | null;
      method?: string | null;
      rangeMin?: string;
      rangeMax?: string;
      quantity?: number;
      unitPrice?: number | null;
      discountAmount?: number | null;
    };

    return {
      serviceId: String(rowItem.serviceId ?? rowItem.parameterId ?? `service-${index}`),
      parameterId: String(rowItem.parameterId ?? rowItem.serviceId ?? `p-${index}`),
      parameterLabel: String(rowItem.parameterLabel ?? rowItem.parameterId ?? 'Servicio'),
      tableLabel: typeof rowItem.tableLabel === 'string' ? rowItem.tableLabel : null,
      unit: typeof rowItem.unit === 'string' ? rowItem.unit : null,
      method: typeof rowItem.method === 'string' ? rowItem.method : null,
      rangeMin: String(rowItem.rangeMin ?? ''),
      rangeMax: String(rowItem.rangeMax ?? ''),
      quantity: Math.max(1, Number(rowItem.quantity ?? 1)),
      unitPrice: Number(rowItem.unitPrice ?? 0),
      discountAmount: Math.max(0, Number(rowItem.discountAmount ?? 0))
    };
  });
};

const normalizeWorkOrderStatus = (value: unknown): WorkOrderStatus => {
  const rawStatus = String(value ?? '').toLowerCase();
  if (
    rawStatus === 'issued' ||
    rawStatus === 'paused' ||
    rawStatus === 'completed' ||
    rawStatus === 'cancelled'
  ) {
    return rawStatus as WorkOrderStatus;
  }
  return 'unknown';
};

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const getRequestServiceItemsFromDoc = (data: Record<string, unknown>): RequestServiceItem[] => {
  const rawServiceItems =
    data.services &&
    typeof data.services === 'object' &&
    !Array.isArray(data.services)
      ? (data.services as { items?: unknown[] }).items
      : Array.isArray(data.services)
        ? (data.services as unknown[])
        : [];

  return normalizeRequestServiceItems(toArray(rawServiceItems));
};

export const buildWorkOrderRowFromDoc = (
  id: string,
  data: Record<string, unknown>,
  sourceRequestServicesById: Record<string, RequestServiceItem[]>
): WorkOrderRow => {
  const matrix = normalizeMatrixArray(data.matrix);
  const status = normalizeWorkOrderStatus(data.status);

  const pricing =
    typeof data.pricing === 'object' && data.pricing !== null
      ? (data.pricing as { total?: number | null; subtotal?: number | null; taxPercent?: number | null })
      : {};
  const total = Number(pricing.total ?? 0);
  const subtotal = Number(pricing.subtotal ?? 0);
  const taxPercent = Number(pricing.taxPercent ?? 15);

  const agreedCount =
    typeof data.samples === 'object' && data.samples !== null
      ? Number((data.samples as { agreedCount?: number }).agreedCount ?? 0)
      : 0;

  const analysesItemsRaw =
    typeof data.analyses === 'object' && data.analyses !== null
      ? toArray((data.analyses as { items?: unknown[] }).items)
      : [];

  const analysesCount = analysesItemsRaw.length;

  const client =
    typeof data.client === 'object' && data.client !== null
      ? {
          businessName: String((data.client as { businessName?: string }).businessName ?? ''),
          taxId: String((data.client as { taxId?: string }).taxId ?? ''),
          contactName: String((data.client as { contactName?: string }).contactName ?? '')
        }
      : {
          businessName: '',
          taxId: '',
          contactName: ''
        };

  const sampleItems =
    typeof data.samples === 'object' && data.samples !== null
      ? toArray((data.samples as { items?: unknown[] }).items).map((item) => {
          const rowItem = item as { sampleCode?: string; sampleType?: string };
          return {
            sampleCode: String(rowItem.sampleCode ?? '—'),
            sampleType: String(rowItem.sampleType ?? 'Sin tipo')
          };
        })
      : [];

  const analysisItems = analysesItemsRaw.map((item) => {
    const rowItem = item as { parameterLabelEs?: string; unitPrice?: number | null };
    return {
      parameterLabelEs: String(rowItem.parameterLabelEs ?? 'Parámetro'),
      unitPrice: Number(rowItem.unitPrice ?? 0)
    };
  });

  const rawDirectServices =
    data.services &&
    typeof data.services === 'object' &&
    !Array.isArray(data.services)
      ? (data.services as { items?: unknown[] }).items
      : Array.isArray(data.services)
        ? (data.services as unknown[])
        : [];
  const directServiceItems = normalizeRequestServiceItems(toArray(rawDirectServices));

  const sourceRequestId = String(data.sourceRequestId ?? '');
  const fallbackServiceItems = sourceRequestId
    ? sourceRequestServicesById[sourceRequestId] || []
    : [];

  const normalizedServiceItems =
    directServiceItems.length > 0
      ? directServiceItems
      : fallbackServiceItems.length > 0
        ? fallbackServiceItems
        : analysisItems.map((analysis, index) => ({
            serviceId: `legacy-${index}`,
            parameterId: `legacy-${index}`,
            parameterLabel: analysis.parameterLabelEs,
            tableLabel: null,
            unit: null,
            method: null,
            rangeMin: '',
            rangeMax: '',
            quantity: agreedCount > 0 ? agreedCount : 1,
            unitPrice: Number(analysis.unitPrice ?? 0),
            discountAmount: 0
          }));

  return {
    id,
    workOrderNumber: String(data.workOrderNumber ?? id),
    sourceReference: String(data.sourceReference ?? '—'),
    sourceRequestId,
    notes: String(data.notes ?? ''),
    matrix,
    status,
    client,
    serviceItems: normalizedServiceItems,
    sampleItems,
    analysisItems,
    taxPercent: Number.isFinite(taxPercent) ? taxPercent : 15,
    clientBusinessName: client.businessName || '—',
    agreedCount,
    analysesCount: normalizedServiceItems.length || analysesCount,
    total: Number.isFinite(total) ? total : 0,
    subtotal: Number.isFinite(subtotal) ? subtotal : 0,
    updatedAtLabel: formatFirestoreTimestamp(data.updatedAt),
    updatedAtMs: firestoreTimestampToMs(data.updatedAt)
  };
};
