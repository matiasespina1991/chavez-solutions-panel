import {
  ConfigurationServiceItem,
  ImportedServiceDocument
} from '@/features/configurator/services/configurations';
import {
  FormValues,
  SelectedService,
  SelectedServiceGroup
} from '@/features/configurator/lib/configurator-form-model';

export const normalizeRangeValue = (raw: string) => {
  const value = raw.trim();
  if (!value) return '';

  const hasComma = value.includes(',');
  const hasDot = value.includes('.');

  if (hasComma && hasDot && /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(value)) {
    return value.replace(/,/g, '');
  }

  if (hasComma && hasDot && /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(value)) {
    return value.replace(/\./g, '').replace(',', '.');
  }

  if (hasComma && hasDot) {
    return value.replace(/,/g, '');
  }

  if (hasComma && !hasDot) {
    return value.replace(',', '.');
  }

  return value;
};

export const formatRange = (service: SelectedService) => {
  const lower = service.rangeMin.trim();
  const upper = service.rangeMax.trim();
  if (!lower && !upper) return '—';
  if (lower && upper) return `${lower} a ${upper}`;
  return lower || upper;
};

export const parseRangeOffered = (rangeOffered: string) => {
  const normalized = rangeOffered.trim();
  if (!normalized || normalized === '—') {
    return { rangeMin: '', rangeMax: '' };
  }

  const parts = normalized.split(/\s+a\s+/i);
  if (parts.length === 2) {
    return {
      rangeMin: normalizeRangeValue(parts[0]),
      rangeMax: normalizeRangeValue(parts[1])
    };
  }

  return { rangeMin: normalizeRangeValue(normalized), rangeMax: '' };
};

export const mapServicesToAnalyses = (
  services: SelectedService[],
  getServiceId: (service: ImportedServiceDocument) => string
): FormValues['analyses']['items'] =>
  services.map((service) => ({
    parameterId: getServiceId(service),
    parameterLabelEs: service.ID_PARAMETRO || getServiceId(service) || '-',
    unit: service.UNIDAD_NORMA || service.UNIDAD_INTERNO || '-',
    method:
      service.ID_TECNICA ||
      service.ID_MET_REFERENCIA ||
      service.ID_MET_INTERNO ||
      '-',
    rangeOffered: formatRange(service),
    isAccredited: false,
    turnaround: 'standard',
    unitPrice: service.unitPrice,
    discountAmount: service.discountAmount,
    appliesToSampleCodes: null
  }));

export const mapSelectedServicesToDocument = (
  services: SelectedService[],
  getServiceId: (service: ImportedServiceDocument) => string
): ConfigurationServiceItem[] =>
  services.map((service) => ({
    serviceId: service.id,
    parameterId: getServiceId(service),
    parameterLabel: service.ID_PARAMETRO || getServiceId(service) || '-',
    tableLabel: service.ID_TABLA_NORMA || null,
    unit: service.UNIDAD_NORMA || service.UNIDAD_INTERNO || null,
    method:
      service.ID_TECNICA ||
      service.ID_MET_REFERENCIA ||
      service.ID_MET_INTERNO ||
      null,
    rangeMin: service.rangeMin,
    rangeMax: service.rangeMax,
    quantity: service.quantity,
    unitPrice: service.unitPrice,
    discountAmount: service.discountAmount
  }));

export const mapServiceGroupsToDocument = (
  groups: SelectedServiceGroup[],
  getServiceId: (service: ImportedServiceDocument) => string
) => {
  return groups
    .map((group) => {
      return {
        name: group.name,
        items: mapSelectedServicesToDocument(group.items, getServiceId)
      };
    })
    .filter((group) => group.items.length > 0);
};

export const mapStoredServicesToSelected = (
  services: ConfigurationServiceItem[],
  toSelectedService: (
    service: ImportedServiceDocument,
    overrides?: Partial<SelectedService>
  ) => SelectedService
): SelectedService[] =>
  services.map((service) =>
    toSelectedService(
      {
        id: service.serviceId || service.parameterId,
        ID_CONFIG_PARAMETRO: service.parameterId,
        ID_PARAMETRO: service.parameterLabel,
        ID_TABLA_NORMA: service.tableLabel || undefined,
        UNIDAD_NORMA: service.unit || undefined,
        ID_TECNICA: service.method || undefined,
        LIM_INF_NORMA: undefined,
        LIM_SUP_NORMA: undefined,
        PRECIO: service.unitPrice
      },
      {
        quantity: service.quantity,
        rangeMin: service.rangeMin,
        rangeMax: service.rangeMax,
        unitPrice: service.unitPrice,
        discountAmount: service.discountAmount
      }
    )
  );

export const mapStoredServiceGroups = (
  grouped:
    | {
        name?: string;
        items?: ConfigurationServiceItem[];
      }[]
    | undefined,
  toSelectedService: (
    service: ImportedServiceDocument,
    overrides?: Partial<SelectedService>
  ) => SelectedService
): SelectedServiceGroup[] => {
  if (!Array.isArray(grouped)) return [];

  return grouped
    .map((group, index) => {
      const items = Array.isArray(group.items)
        ? mapStoredServicesToSelected(group.items, toSelectedService)
        : [];

      return {
        id: `group-${Date.now()}-${index}`,
        name:
          typeof group.name === 'string' && group.name.trim().length > 0
            ? group.name.trim()
            : `Combo ${index + 1}`,
        items
      };
    })
    .filter((group) => group.items.length > 0);
};
