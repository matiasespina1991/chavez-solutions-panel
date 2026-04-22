import type { RequestListRow as RequestRow } from '@/types/domain';
import type {
  ProformaPreviewLineSource,
  ProformaPreviewPdfPayload,
  ProformaPreviewPdfServiceLine
} from '@/features/configurator/services/configurations';
import { getValidUntilMs, formatDateLabel } from './request-status';

type ToPreviewServiceLine = (
  input: ProformaPreviewLineSource
) => ProformaPreviewPdfServiceLine;

export const buildProformaPreviewPayloadFromRequestRow = (
  row: RequestRow,
  toProformaPreviewServiceLine: ToPreviewServiceLine
): ProformaPreviewPdfPayload => {
  const issuedAtMs = row.createdAtMs || Date.now();
  const validUntilMs = getValidUntilMs(row.createdAtMs, row.validDays);

  return {
    reference: row.reference,
    matrixLabels: [],
    validDays: row.validDays,
    issuedAtLabel: formatDateLabel(issuedAtMs),
    validUntilLabel: formatDateLabel(validUntilMs),
    client: {
      businessName: row.client.businessName || '',
      taxId: row.client.taxId || '',
      contactName: row.client.contactName || '',
      address: row.client.address || '',
      city: row.client.city || '',
      email: row.client.email || '',
      phone: row.client.phone || '',
      mobile: ''
    },
    services: row.serviceItems.map((service) =>
      toProformaPreviewServiceLine({
        tableLabel: service.tableLabel,
        label: service.parameterLabel,
        parameterId: service.parameterId,
        unit: service.unit,
        method: service.method,
        rangeMin: service.rangeMin,
        rangeMax: service.rangeMax,
        quantity: service.quantity,
        unitPrice: service.unitPrice,
        discountAmount: service.discountAmount
      })
    ),
    serviceGroups: row.serviceGroups.map((group, groupIndex) => ({
      name: group.name || `Combo ${groupIndex + 1}`,
      items: group.items.map((item) =>
        toProformaPreviewServiceLine({
          tableLabel: item.tableLabel,
          label: item.parameterLabel,
          parameterId: item.parameterId,
          unit: item.unit,
          method: item.method,
          rangeMin: item.rangeMin,
          rangeMax: item.rangeMax,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount
        })
      )
    })),
    pricing: {
      subtotal: row.subtotal ?? 0,
      taxPercent: row.taxPercent ?? 15,
      total: row.total ?? 0
    }
  };
};
