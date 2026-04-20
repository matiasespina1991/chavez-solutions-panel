import type {
  ProformaPreviewServiceGroup,
  ProformaPreviewServiceLine
} from './proformaPreviewPdf.js';

export interface SourceServiceLine {
  tableLabel?: string | null;
  parameterLabel?: string | null;
  parameterId?: string | null;
  unit?: string | null;
  method?: string | null;
  rangeMin?: string | null;
  rangeMax?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  discountAmount?: number | null;
}

interface SourceGroupedService {
  name?: string | null;
  items?: SourceServiceLine[] | null;
}

const toSourceServiceLines = (value: unknown): SourceServiceLine[] => {
  if (!Array.isArray(value)) return [];
  return value as SourceServiceLine[];
};

const toGroupedServices = (value: unknown): SourceGroupedService[] => {
  if (!Array.isArray(value)) return [];
  return value as SourceGroupedService[];
};

export const toProformaPreviewServiceLine = (
  service: SourceServiceLine
): ProformaPreviewServiceLine => {
  const quantity = Number(service.quantity ?? 0);
  const safeQuantity =
    Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0;
  const unitPrice =
    typeof service.unitPrice === 'number' && Number.isFinite(service.unitPrice)
      ? service.unitPrice
      : null;
  const discountAmount =
    typeof service.discountAmount === 'number' &&
    Number.isFinite(service.discountAmount)
      ? service.discountAmount
      : null;
  const subtotal =
    unitPrice === null
      ? null
      : Math.max(0, safeQuantity * unitPrice - (discountAmount ?? 0));

  return {
    table: service.tableLabel || 'Sin tabla',
    label: service.parameterLabel || service.parameterId || 'Servicio',
    unit: service.unit || '',
    method: service.method || '',
    rangeOffered: `${service.rangeMin || '—'} a ${service.rangeMax || '—'}`,
    quantity: safeQuantity,
    unitPrice,
    discountAmount,
    subtotal
  };
};

export const mapRequestServicesToPreview = (
  value: unknown
): {
  services: ProformaPreviewServiceLine[];
  serviceGroups: ProformaPreviewServiceGroup[];
} => {
  const serviceItems =
    value && typeof value === 'object' && !Array.isArray(value)
      ? toSourceServiceLines((value as { items?: unknown }).items)
      : toSourceServiceLines(value);
  const serviceGroups =
    value && typeof value === 'object' && !Array.isArray(value)
      ? toGroupedServices((value as { grouped?: unknown }).grouped)
      : [];

  return {
    services: serviceItems.map(toProformaPreviewServiceLine),
    serviceGroups: serviceGroups
      .map((group, groupIndex) => ({
        name: (group.name || '').trim() || `Combo ${groupIndex + 1}`,
        items: toSourceServiceLines(group.items).map(toProformaPreviewServiceLine)
      }))
      .filter((group) => group.items.length > 0)
  };
};
