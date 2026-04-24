import { Timestamp } from 'firebase/firestore';

export type EditableFieldKey =
  | 'ID_CONDICION_PARAMETRO'
  | 'ID_PARAMETRO'
  | 'ID_MAT_ENSAYO'
  | 'ID_MATRIZ'
  | 'ID_UBICACION'
  | 'ID_NORMA'
  | 'ID_TABLA_NORMA'
  | 'ID_TECNICA'
  | 'ID_MET_INTERNO'
  | 'ID_MET_REFERENCIA'
  | 'UNIDAD_INTERNO'
  | 'LIM_INF_INTERNO'
  | 'LIM_SUP_INTERNO';

export type SortableCatalogFieldKey = 'ID_CONFIG_PARAMETRO' | EditableFieldKey;
export type SortDirection = 'asc' | 'desc' | null;

export type ServiceCatalogRow = {
  id: string;
  updatedAtISO: string | null;
  ID_CONFIG_PARAMETRO: string;
  ID_CONDICION_PARAMETRO: string;
  ID_PARAMETRO: string;
  ID_MAT_ENSAYO: string;
  ID_MATRIZ: string;
  ID_UBICACION: string;
  ID_NORMA: string;
  ID_TABLA_NORMA: string;
  ID_TECNICA: string;
  ID_MET_INTERNO: string;
  ID_MET_REFERENCIA: string;
  UNIDAD_INTERNO: string;
  UNIDAD_NORMA: string;
  LIM_INF_INTERNO: string;
  LIM_SUP_INTERNO: string;
  LIM_INF_NORMA: string;
  LIM_SUP_NORMA: string;
};

export type CreateServiceDraft = {
  ID_CONFIG_PARAMETRO: string;
  ID_PARAMETRO: string;
  ID_CONDICION_PARAMETRO: string;
  ID_UBICACION: string;
  ID_MATRIZ: string;
  ID_MAT_ENSAYO: string;
  ID_NORMA: string;
  ID_TABLA_NORMA: string;
  ID_TECNICA: string;
  ID_MET_INTERNO: string;
  ID_MET_REFERENCIA: string;
  UNIDAD_INTERNO: string;
  UNIDAD_NORMA: string;
  LIM_INF_INTERNO: string;
  LIM_SUP_INTERNO: string;
  LIM_INF_NORMA: string;
  LIM_SUP_NORMA: string;
};

export const INITIAL_CREATE_SERVICE_DRAFT: CreateServiceDraft = {
  ID_CONFIG_PARAMETRO: '',
  ID_PARAMETRO: '',
  ID_CONDICION_PARAMETRO: 'ACREDITADO',
  ID_UBICACION: '',
  ID_MATRIZ: '',
  ID_MAT_ENSAYO: '',
  ID_NORMA: '',
  ID_TABLA_NORMA: '',
  ID_TECNICA: '',
  ID_MET_INTERNO: '',
  ID_MET_REFERENCIA: '',
  UNIDAD_INTERNO: '',
  UNIDAD_NORMA: '',
  LIM_INF_INTERNO: '',
  LIM_SUP_INTERNO: '',
  LIM_INF_NORMA: '',
  LIM_SUP_NORMA: ''
};

export const CREATE_SERVICE_SECTIONS: Array<{
  title: string;
  description: string;
  fieldsGridClass?: string;
  fields: Array<{
    key: keyof CreateServiceDraft;
    label: string;
    className?: string;
    placeholder?: string;
  }>;
}> = [
  {
    title: 'Identificación técnica',
    description:
      'Define el identificador del servicio y sus metadatos base para trazabilidad.',
    fieldsGridClass: 'grid grid-cols-1 gap-3 md:grid-cols-2',
    fields: [
      {
        key: 'ID_CONFIG_PARAMETRO',
        label: 'ID config parámetro',
        placeholder: '9bb504ee'
      },
      {
        key: 'ID_UBICACION',
        label: 'Ubicación',
        placeholder: 'MATRIZ QUITO'
      },
      { key: 'ID_PARAMETRO', label: 'Parámetro', placeholder: 'Manganeso' },
      {
        key: 'ID_CONDICION_PARAMETRO',
        label: 'Condición del parámetro'
      }
    ]
  },
  {
    title: 'Clasificación comercial',
    description:
      'Especifica la matriz, el material de ensayo y la normativa asociada al servicio.',
    fields: [
      {
        key: 'ID_MATRIZ',
        label: 'Matriz',
        placeholder: 'Análisis Físicos – Químicos en Aguas'
      },
      {
        key: 'ID_MAT_ENSAYO',
        label: 'Material de ensayo',
        placeholder: 'AGUAS RESIDUALES'
      },
      {
        key: 'ID_NORMA',
        label: 'Norma',
        placeholder: 'OM138-QUITO-NT002'
      },
      {
        key: 'ID_TABLA_NORMA',
        label: 'Tabla normativa',
        className: 'md:col-span-2 xl:col-span-3',
        placeholder: 'TABLA No. A3. CRITERIOS DE CALIDAD...'
      }
    ]
  },
  {
    title: 'Método y técnica',
    description:
      'Completa el método interno/de referencia y la técnica de laboratorio aplicable.',
    fieldsGridClass: 'grid grid-cols-1 gap-3 md:grid-cols-2',
    fields: [
      {
        key: 'ID_TECNICA',
        label: 'Técnica',
        className: 'md:col-span-2',
        placeholder:
          'Espectrofotometría de Absorción Atómica, Llama Aire - Acetileno'
      },
      {
        key: 'ID_MET_INTERNO',
        label: 'Método interno',
        className: 'md:col-span-1 md:col-start-1',
        placeholder: 'PEE 48'
      },
      {
        key: 'ID_MET_REFERENCIA',
        label: 'Método de referencia',
        className: 'md:col-span-1 md:col-start-1',
        placeholder: 'MR-078'
      }
    ]
  },
  {
    title: 'Rangos y unidades',
    description: 'Define rangos internos/de norma y unidades de referencia.',
    fieldsGridClass: 'grid grid-cols-1 gap-3 md:grid-cols-2',
    fields: [
      {
        key: 'LIM_INF_INTERNO',
        label: 'Límite inferior interno',
        placeholder: '0.10'
      },
      {
        key: 'LIM_SUP_INTERNO',
        label: 'Límite superior interno',
        placeholder: '1.00'
      },
      {
        key: 'LIM_INF_NORMA',
        label: 'Límite inferior norma',
        placeholder: '0.10'
      },
      {
        key: 'LIM_SUP_NORMA',
        label: 'Límite superior norma',
        placeholder: '1.00'
      },
      { key: 'UNIDAD_NORMA', label: 'Unidad norma', placeholder: 'mg/L' },
      {
        key: 'UNIDAD_INTERNO',
        label: 'Unidad interna',
        placeholder: 'mg/L'
      },
    ]
  }
];

export const PAGE_SIZE = 20;

export const EDITABLE_COLUMNS: Array<{
  key: EditableFieldKey;
  label: string;
  minWidth: string;
}> = [
  { key: 'ID_PARAMETRO', label: 'Parámetro', minWidth: 'min-w-[14rem]' },
  { key: 'ID_MAT_ENSAYO', label: 'Material', minWidth: 'min-w-[12rem]' },
  { key: 'ID_MATRIZ', label: 'Matriz', minWidth: 'min-w-[26rem]' },
  { key: 'ID_UBICACION', label: 'Ubicación', minWidth: 'min-w-[11rem]' },
  { key: 'ID_NORMA', label: 'Norma', minWidth: 'min-w-[15rem]' },
  { key: 'ID_TABLA_NORMA', label: 'Tabla', minWidth: 'min-w-[32rem]' },
  { key: 'ID_TECNICA', label: 'Técnica', minWidth: 'min-w-[17rem]' },
  { key: 'ID_MET_INTERNO', label: 'Método interno', minWidth: 'min-w-[6rem]' },
  {
    key: 'ID_MET_REFERENCIA',
    label: 'Método referencia',
    minWidth: 'min-w-[6rem]'
  },
  {
    key: 'ID_CONDICION_PARAMETRO',
    label: 'Acreditado',
    minWidth: 'min-w-[6rem]'
  },
  { key: 'UNIDAD_INTERNO', label: 'Unidad', minWidth: 'min-w-[10rem]' },
  { key: 'LIM_INF_INTERNO', label: 'Límite inf.', minWidth: 'min-w-[6.5rem]' },
  { key: 'LIM_SUP_INTERNO', label: 'Límite sup.', minWidth: 'min-w-[6.5rem]' }
];

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return `${value}`;
  return '';
};

const toTimestampIso = (value: unknown): string | null => {
  if (value instanceof Timestamp) return value.toDate().toISOString();

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toISOString();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }

  return null;
};

export const buildRowFromDoc = (
  id: string,
  data: Record<string, unknown>
): ServiceCatalogRow => ({
  id,
  updatedAtISO: toTimestampIso(data.updatedAt),
  ID_CONFIG_PARAMETRO: toStringValue(data.ID_CONFIG_PARAMETRO) || id,
  ID_CONDICION_PARAMETRO:
    toStringValue(data.ID_CONDICION_PARAMETRO) || 'ACREDITADO',
  ID_PARAMETRO: toStringValue(data.ID_PARAMETRO),
  ID_MAT_ENSAYO: toStringValue(data.ID_MAT_ENSAYO),
  ID_MATRIZ: toStringValue(data.ID_MATRIZ),
  ID_UBICACION: toStringValue(data.ID_UBICACION),
  ID_NORMA: toStringValue(data.ID_NORMA),
  ID_TABLA_NORMA: toStringValue(data.ID_TABLA_NORMA),
  ID_TECNICA: toStringValue(data.ID_TECNICA),
  ID_MET_INTERNO: toStringValue(data.ID_MET_INTERNO),
  ID_MET_REFERENCIA: toStringValue(data.ID_MET_REFERENCIA),
  UNIDAD_INTERNO: toStringValue(data.UNIDAD_INTERNO),
  UNIDAD_NORMA: toStringValue(data.UNIDAD_NORMA),
  LIM_INF_INTERNO: toStringValue(data.LIM_INF_INTERNO),
  LIM_SUP_INTERNO: toStringValue(data.LIM_SUP_INTERNO),
  LIM_INF_NORMA: toStringValue(data.LIM_INF_NORMA),
  LIM_SUP_NORMA: toStringValue(data.LIM_SUP_NORMA)
});

export const AUTOCOMPLETE_FIELD_KEYS: Array<keyof CreateServiceDraft> = [
  'ID_PARAMETRO',
  'ID_TABLA_NORMA',
  'ID_NORMA',
  'ID_MAT_ENSAYO',
  'ID_MET_INTERNO',
  'UNIDAD_INTERNO',
  'UNIDAD_NORMA',
  'ID_MATRIZ',
  'ID_TECNICA',
  'ID_UBICACION'
];

export const CREATE_SERVICE_REQUIRED_FIELDS: Array<keyof CreateServiceDraft> = [
  'ID_CONFIG_PARAMETRO',
  'ID_PARAMETRO',
  'ID_MATRIZ',
  'ID_MAT_ENSAYO',
  'ID_NORMA',
  'ID_TABLA_NORMA',
  'ID_TECNICA',
  'UNIDAD_INTERNO',
  'UNIDAD_NORMA',
  'LIM_INF_INTERNO',
  'LIM_SUP_INTERNO',
  'LIM_INF_NORMA',
  'LIM_SUP_NORMA'
];

export const normalizeForCompare = (value: string): string => value.trim();
export const normalizeForAutocomplete = (value: string): string =>
  value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim();

export const getChangedPatch = (
  current: ServiceCatalogRow,
  original: ServiceCatalogRow | undefined
): Record<string, string | number | null> => {
  if (!original) return {};

  const patch: Record<string, string | number | null> = {};

  for (const { key } of EDITABLE_COLUMNS) {
    const nextRaw = current[key];
    const prevRaw = original[key];

    const next = normalizeForCompare(nextRaw);
    const prev = normalizeForCompare(prevRaw);

    if (next !== prev) {
      patch[key] = next;
    }
  }

  return patch;
};
