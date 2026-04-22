import {
  firestoreTimestampToMs,
  formatFirestoreTimestamp
} from '@/lib/firestore-timestamps';
import { normalizeMatrixArray } from '@/lib/request-normalizers';
import type {
  RequestApprovalStatus,
  RequestListRow as RequestRow,
  RequestStatus
} from '@/types/domain';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

export const mapRequestSnapshotDocToRow = (
  docSnap: QueryDocumentSnapshot<DocumentData>
): RequestRow => {
  const value = docSnap.data() as Record<string, unknown>;

  const isWorkOrder = Boolean(value.isWorkOrder);
  const matrix = normalizeMatrixArray(value.matrix);
  const status = (value.status as RequestStatus) ?? ('draft' as RequestStatus);

  const rawApprovalStatus =
    typeof value.approval === 'object' && value.approval !== null
      ? (value.approval as { status?: unknown }).status
      : null;

  const approvalStatus: RequestApprovalStatus | null =
    rawApprovalStatus === 'pending' ||
    rawApprovalStatus === 'approved' ||
    rawApprovalStatus === 'rejected'
      ? rawApprovalStatus
      : null;

  const approvalFeedback =
    typeof value.approval === 'object' && value.approval !== null
      ? String((value.approval as { feedback?: string }).feedback ?? '')
      : '';
  const approvalActorEmail =
    typeof value.approval === 'object' && value.approval !== null
      ? String(
          (
            value.approval as {
              approvedBy?: { email?: string | null } | null;
            }
          ).approvedBy?.email ?? ''
        ).trim() || null
      : null;
  const total =
    typeof value.pricing === 'object' && value.pricing !== null
      ? Number((value.pricing as { total?: number | null }).total ?? 0)
      : 0;
  const subtotal =
    typeof value.pricing === 'object' && value.pricing !== null
      ? Number((value.pricing as { subtotal?: number | null }).subtotal ?? 0)
      : 0;
  const taxPercent =
    typeof value.pricing === 'object' && value.pricing !== null
      ? Number((value.pricing as { taxPercent?: number | null }).taxPercent ?? 15)
      : 15;
  const validDays =
    typeof value.pricing === 'object' && value.pricing !== null
      ? Number((value.pricing as { validDays?: number | null }).validDays ?? 0)
      : 0;

  const createdAtMs =
    firestoreTimestampToMs(value.createdAt) ||
    firestoreTimestampToMs(value.updatedAt);

  const agreedCount =
    typeof value.samples === 'object' && value.samples !== null
      ? Number((value.samples as { agreedCount?: number }).agreedCount ?? 0)
      : 0;

  const legacyAnalysesCount =
    typeof value.analyses === 'object' && value.analyses !== null
      ? Array.isArray((value.analyses as { items?: unknown[] }).items)
        ? ((value.analyses as { items?: unknown[] }).items?.length ?? 0)
        : 0
      : 0;

  const clientBusinessName =
    typeof value.client === 'object' && value.client !== null
      ? String((value.client as { businessName?: string }).businessName ?? '')
      : '';

  const client =
    typeof value.client === 'object' && value.client !== null
      ? {
          businessName: String(
            (value.client as { businessName?: string }).businessName ?? ''
          ),
          taxId: String((value.client as { taxId?: string }).taxId ?? ''),
          contactName: String(
            (value.client as { contactName?: string }).contactName ?? ''
          ),
          address: String((value.client as { address?: string }).address ?? ''),
          city: String((value.client as { city?: string }).city ?? ''),
          email: String((value.client as { email?: string }).email ?? ''),
          phone: String((value.client as { phone?: string }).phone ?? '')
        }
      : {
          businessName: '',
          taxId: '',
          contactName: '',
          address: '',
          city: '',
          email: '',
          phone: ''
        };

  const sampleItems =
    typeof value.samples === 'object' && value.samples !== null
      ? Array.isArray((value.samples as { items?: unknown[] }).items)
        ? ((value.samples as { items?: unknown[] }).items ?? []).map((item) => {
            const rowItem = item as {
              sampleCode?: string;
              sampleType?: string;
            };
            return {
              sampleCode: String(rowItem.sampleCode ?? '—'),
              sampleType: String(rowItem.sampleType ?? 'Sin tipo')
            };
          })
        : []
      : [];

  const analysisItems =
    typeof value.analyses === 'object' && value.analyses !== null
      ? Array.isArray((value.analyses as { items?: unknown[] }).items)
        ? ((value.analyses as { items?: unknown[] }).items ?? []).map((item) => {
            const rowItem = item as {
              parameterLabelEs?: string;
              unitPrice?: number | null;
            };
            return {
              parameterLabelEs: String(rowItem.parameterLabelEs ?? 'Parámetro'),
              unitPrice: Number(rowItem.unitPrice ?? 0)
            };
          })
        : []
      : [];

  const rawServiceItems =
    value.services &&
    typeof value.services === 'object' &&
    !Array.isArray(value.services)
      ? (value.services as { items?: unknown[] }).items
      : Array.isArray(value.services)
        ? (value.services as unknown[])
        : [];

  const serviceItems = Array.isArray(rawServiceItems)
    ? rawServiceItems.map((item, index) => {
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
        const unitPrice = Number(rowItem.unitPrice ?? 0);
        const discountAmount = Number(rowItem.discountAmount ?? 0);
        return {
          serviceId: String(rowItem.serviceId ?? rowItem.parameterId ?? `service-${index}`),
          parameterId: String(rowItem.parameterId ?? rowItem.serviceId ?? `p-${index}`),
          parameterLabel: String(
            rowItem.parameterLabel ?? rowItem.parameterId ?? 'Servicio'
          ),
          tableLabel:
            typeof rowItem.tableLabel === 'string' ? rowItem.tableLabel : null,
          unit: typeof rowItem.unit === 'string' ? rowItem.unit : null,
          method: typeof rowItem.method === 'string' ? rowItem.method : null,
          rangeMin: String(rowItem.rangeMin ?? ''),
          rangeMax: String(rowItem.rangeMax ?? ''),
          quantity: Math.max(1, Number(rowItem.quantity ?? 1)),
          unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
          discountAmount:
            Number.isFinite(discountAmount) && discountAmount >= 0
              ? discountAmount
              : 0
        };
      })
    : [];

  const normalizedServiceItems =
    serviceItems.length > 0
      ? serviceItems
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

  const rawGroupedServiceItems =
    value.services &&
    typeof value.services === 'object' &&
    !Array.isArray(value.services)
      ? (value.services as { grouped?: unknown[] }).grouped
      : [];

  const serviceGroups = Array.isArray(rawGroupedServiceItems)
    ? rawGroupedServiceItems
        .map((group, groupIndex) => {
          const groupValue = group as {
            name?: string;
            items?: unknown[];
          };
          const mappedItems = Array.isArray(groupValue.items)
            ? groupValue.items.map((item, itemIndex) => {
                const rowItem = item as {
                  serviceId?: string;
                  parameterId?: string;
                  parameterLabel?: string;
                  tableLabel?: string | null;
                  unit?: string | null;
                  method?: string | null;
                  rangeMin?: string | null;
                  rangeMax?: string | null;
                  quantity?: number;
                  unitPrice?: number | null;
                  discountAmount?: number | null;
                };
                const unitPrice = Number(rowItem.unitPrice ?? 0);
                const discountAmount = Number(rowItem.discountAmount ?? 0);
                return {
                  serviceId: String(
                    rowItem.serviceId ??
                      rowItem.parameterId ??
                      `grouped-service-${groupIndex}-${itemIndex}`
                  ),
                  parameterId: String(
                    rowItem.parameterId ??
                      rowItem.serviceId ??
                      `grouped-parameter-${groupIndex}-${itemIndex}`
                  ),
                  parameterLabel: String(
                    rowItem.parameterLabel ?? rowItem.parameterId ?? 'Servicio'
                  ),
                  tableLabel:
                    typeof rowItem.tableLabel === 'string'
                      ? rowItem.tableLabel
                      : null,
                  unit: typeof rowItem.unit === 'string' ? rowItem.unit : null,
                  method:
                    typeof rowItem.method === 'string' ? rowItem.method : null,
                  rangeMin: String(rowItem.rangeMin ?? ''),
                  rangeMax: String(rowItem.rangeMax ?? ''),
                  quantity: Math.max(1, Number(rowItem.quantity ?? 1)),
                  unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
                  discountAmount:
                    Number.isFinite(discountAmount) && discountAmount >= 0
                      ? discountAmount
                      : 0
                };
              })
            : [];

          return {
            id: `group-${groupIndex}`,
            name: String(groupValue.name?.trim() || `Combo ${groupIndex + 1}`),
            items: mappedItems
          };
        })
        .filter((group) => group.items.length > 0)
    : [];

  const normalizedServiceGroups =
    serviceGroups.length > 0
      ? serviceGroups
      : normalizedServiceItems.length > 0
        ? [
            {
              id: 'fallback-group',
              name: 'Combo 1',
              items: normalizedServiceItems.map((item) => ({
                serviceId: item.serviceId,
                parameterId: item.parameterId,
                parameterLabel: item.parameterLabel,
                tableLabel: item.tableLabel,
                unit: item.unit,
                method: item.method,
                rangeMin: item.rangeMin,
                rangeMax: item.rangeMax,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountAmount: item.discountAmount
              }))
            }
          ]
        : [];

  return {
    id: docSnap.id,
    reference: String(value.reference ?? '—'),
    notes: String(value.notes ?? ''),
    isWorkOrder,
    matrix,
    status,
    approvalStatus,
    approvalActorEmail,
    approvalFeedback,
    validDays: Number.isFinite(validDays) && validDays > 0 ? validDays : null,
    createdAtMs,
    client,
    serviceItems: normalizedServiceItems,
    serviceGroups: normalizedServiceGroups,
    sampleItems,
    analysisItems,
    taxPercent: Number.isFinite(taxPercent) ? taxPercent : 15,
    clientBusinessName: clientBusinessName || '—',
    agreedCount,
    analysesCount: normalizedServiceItems.length || legacyAnalysesCount,
    total: Number.isFinite(total) ? total : 0,
    subtotal: Number.isFinite(subtotal) ? subtotal : 0,
    updatedAtLabel: formatFirestoreTimestamp(value.updatedAt),
    updatedAtMs: firestoreTimestampToMs(value.updatedAt)
  };
};
