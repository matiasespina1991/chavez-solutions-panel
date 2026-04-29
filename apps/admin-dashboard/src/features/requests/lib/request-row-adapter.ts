import {
  firestoreTimestampToMs,
  formatFirestoreTimestamp
} from '@/lib/firestore-timestamps';
import { normalizeMatrixArray } from '@/lib/request-normalizers';
import {
  isRecord,
  toArray,
  toFiniteNumber,
  toNullableString,
  toSafeString
} from '@/lib/runtime-guards';
import type {
  RequestApprovalStatus,
  RequestListRow as RequestRow,
  RequestStatus
} from '@/types/domain';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

export const mapRequestSnapshotDocToRow = (
  docSnap: QueryDocumentSnapshot
): RequestRow => {
  const value = docSnap.data();

  const isWorkOrder = Boolean(value.isWorkOrder);
  const matrix = normalizeMatrixArray(value.matrix);
  const status = (value.status as RequestStatus) ?? ('draft');

  const approval = isRecord(value.approval)
    ? (value.approval as Record<string, unknown>)
    : null;
  const rawApprovalStatus = approval ? approval.status : null;

  const approvalStatus: RequestApprovalStatus | null =
    rawApprovalStatus === 'pending' ||
    rawApprovalStatus === 'approved' ||
    rawApprovalStatus === 'rejected'
      ? rawApprovalStatus
      : null;

  const approvalFeedback = approval ? toSafeString(approval.feedback) : '';
  const approvedBy = approval && isRecord(approval.approvedBy)
    ? (approval.approvedBy as Record<string, unknown>)
    : null;
  const approvalActorEmail = approvedBy
    ? toSafeString(approvedBy.email).trim() || null
    : null;
  const pricing = isRecord(value.pricing)
    ? (value.pricing as Record<string, unknown>)
    : null;
  const total = toFiniteNumber(pricing?.total, 0);
  const subtotal = toFiniteNumber(pricing?.subtotal, 0);
  const taxPercent = toFiniteNumber(pricing?.taxPercent, 15);
  const validDays = toFiniteNumber(pricing?.validDays, 0);

  const createdAtMs =
    firestoreTimestampToMs(value.createdAt) ||
    firestoreTimestampToMs(value.updatedAt);

  const samples = isRecord(value.samples)
    ? (value.samples as Record<string, unknown>)
    : null;
  const analyses = isRecord(value.analyses)
    ? (value.analyses as Record<string, unknown>)
    : null;
  const clientValue = isRecord(value.client)
    ? (value.client as Record<string, unknown>)
    : null;
  const servicesValue = isRecord(value.services)
    ? (value.services as Record<string, unknown>)
    : null;
  const agreedCount = toFiniteNumber(samples?.agreedCount, 0);

  const legacyAnalysesCount = toArray(analyses?.items).length;

  const clientBusinessName = toSafeString(clientValue?.businessName);

  const client = {
    businessName: toSafeString(clientValue?.businessName),
    taxId: toSafeString(clientValue?.taxId),
    contactName: toSafeString(clientValue?.contactName),
    address: toSafeString(clientValue?.address),
    city: toSafeString(clientValue?.city),
    email: toSafeString(clientValue?.email),
    phone: toSafeString(clientValue?.phone)
  };

  const sampleItems = toArray(samples?.items).map((item) => {
    const rowItem = isRecord(item) ? item : {};
    return {
      sampleCode: toSafeString(rowItem.sampleCode, '—'),
      sampleType: toSafeString(rowItem.sampleType, 'Sin tipo')
    };
  });

  const analysisItems = toArray(analyses?.items).map((item) => {
    const rowItem = isRecord(item) ? item : {};
    return {
      parameterLabelEs: toSafeString(rowItem.parameterLabelEs, 'Parámetro'),
      unitPrice: toFiniteNumber(rowItem.unitPrice, 0)
    };
  });

  const rawServiceItems = servicesValue
    ? servicesValue.items
    : Array.isArray(value.services)
      ? value.services
      : [];

  const serviceItems = toArray(rawServiceItems).map((item, index) => {
      const rowItem = (isRecord(item) ? item : {}) as Record<string, unknown>;
      const unitPrice = toFiniteNumber(rowItem.unitPrice, 0);
      const discountAmount = toFiniteNumber(rowItem.discountAmount, 0);
      return {
        serviceId: toSafeString(
          rowItem.serviceId ?? rowItem.parameterId,
          `service-${index}`
        ),
        parameterId: toSafeString(
          rowItem.parameterId ?? rowItem.serviceId,
          `p-${index}`
        ),
        parameterLabel: toSafeString(
          rowItem.parameterLabel ?? rowItem.parameterId,
          'Servicio'
        ),
        tableLabel: toNullableString(rowItem.tableLabel),
        unit: toNullableString(rowItem.unit),
        method: toNullableString(rowItem.method),
        rangeMin: toSafeString(rowItem.rangeMin),
        rangeMax: toSafeString(rowItem.rangeMax),
        quantity: Math.max(1, toFiniteNumber(rowItem.quantity, 1)),
        unitPrice,
        discountAmount:
            discountAmount >= 0 ? discountAmount : 0
      };
    });

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

  const rawGroupedServiceItems = servicesValue?.grouped;

  const serviceGroups = toArray(rawGroupedServiceItems)
      .map((group, groupIndex) => {
        const groupValue = isRecord(group) ? group : {};
        const mappedItems = toArray(groupValue.items).map((item, itemIndex) => {
            const rowItem = (isRecord(item) ? item : {}) as Record<string, unknown>;
            const unitPrice = toFiniteNumber(rowItem.unitPrice, 0);
            const discountAmount = toFiniteNumber(rowItem.discountAmount, 0);
            return {
              serviceId: toSafeString(
                rowItem.serviceId ??
                rowItem.parameterId ??
                `grouped-service-${groupIndex}-${itemIndex}`
              ),
              parameterId: toSafeString(
                rowItem.parameterId ??
                rowItem.serviceId ??
                `grouped-parameter-${groupIndex}-${itemIndex}`
              ),
              parameterLabel: toSafeString(
                rowItem.parameterLabel ?? rowItem.parameterId,
                'Servicio'
              ),
              tableLabel: toNullableString(rowItem.tableLabel),
              unit: toNullableString(rowItem.unit),
              method: toNullableString(rowItem.method),
              rangeMin: toSafeString(rowItem.rangeMin),
              rangeMax: toSafeString(rowItem.rangeMax),
              quantity: Math.max(1, toFiniteNumber(rowItem.quantity, 1)),
              unitPrice,
              discountAmount:
                    discountAmount >= 0 ? discountAmount : 0
            };
          });

        return {
          id: `group-${groupIndex}`,
          name: toSafeString(groupValue.name).trim() || `Combo ${groupIndex + 1}`,
          items: mappedItems
        };
      })
      .filter((group) => group.items.length > 0);

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
