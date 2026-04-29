import type { ClientPayload } from '../types/clients.js';

export const CLIENT_FIELDS = [
  'businessName',
  'taxId',
  'contactName',
  'contactRole',
  'email',
  'phone',
  'address',
  'city',
] as const;

export const REQUIRED_CLIENT_FIELDS = [
  'businessName',
  'taxId',
  'contactName',
  'email',
  'phone',
  'address',
  'city',
] as const;

export type ClientField = (typeof CLIENT_FIELDS)[number];

export interface NormalizedClientPayload extends ClientPayload {
  taxIdNormalized: string;
  emailNormalized: string;
}

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';

export const normalizeClientTaxId = (value: unknown): string =>
  toTrimmedString(value).replace(/\D/g, '');

export const normalizeClientEmail = (value: unknown): string =>
  toTrimmedString(value).toLowerCase();

export const normalizeClientPayload = (
  source: Partial<Record<ClientField, unknown>>
): NormalizedClientPayload => {
  const payload = CLIENT_FIELDS.reduce<Record<ClientField, string>>(
    (acc, field) => {
      acc[field] = toTrimmedString(source[field]);
      return acc;
    },
    {
      businessName: '',
      taxId: '',
      contactName: '',
      contactRole: '',
      email: '',
      phone: '',
      address: '',
      city: '',
    }
  );

  return {
    ...payload,
    taxIdNormalized: normalizeClientTaxId(payload.taxId),
    emailNormalized: normalizeClientEmail(payload.email),
  };
};

export const getMissingRequiredClientFields = (
  payload: NormalizedClientPayload
): string[] =>
  REQUIRED_CLIENT_FIELDS.filter((field) => payload[field].trim().length === 0);

export const getClientDedupKey = (
  payload: Pick<NormalizedClientPayload, 'taxIdNormalized' | 'emailNormalized'>
): string | null => {
  if (payload.taxIdNormalized) return `tax:${payload.taxIdNormalized}`;
  if (payload.emailNormalized) return `email:${payload.emailNormalized}`;
  return null;
};

export const dedupeClientSources = (
  sources: Array<Partial<Record<ClientField, unknown>>>
): { clients: NormalizedClientPayload[]; skippedInvalid: number } => {
  const byKey = new Map<string, NormalizedClientPayload>();
  let skippedInvalid = 0;

  for (const source of sources) {
    const payload = normalizeClientPayload(source);
    const key = getClientDedupKey(payload);

    if (!key || !payload.businessName) {
      skippedInvalid += 1;
      continue;
    }

    if (!byKey.has(key)) {
      byKey.set(key, payload);
    }
  }

  return {
    clients: [...byKey.values()],
    skippedInvalid,
  };
};
