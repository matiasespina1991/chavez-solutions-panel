import { Timestamp } from 'firebase/firestore';
import { isRecord, toSafeString } from '@/lib/runtime-guards';

export type ClientEditableFieldKey =
  | 'businessName'
  | 'taxId'
  | 'contactName'
  | 'contactRole'
  | 'email'
  | 'phone'
  | 'city'
  | 'address';

export type ClientSortableFieldKey = ClientEditableFieldKey;
export type SortDirection = 'asc' | 'desc' | null;

export interface ClientRow {
  id: string;
  updatedAtISO: string | null;
  businessName: string;
  taxId: string;
  contactName: string;
  contactRole: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  taxIdNormalized: string;
  emailNormalized: string;
}

export type ClientDraft = Pick<ClientRow, ClientEditableFieldKey>;

export const INITIAL_CLIENT_DRAFT: ClientDraft = {
  businessName: '',
  taxId: '',
  contactName: '',
  contactRole: '',
  email: '',
  phone: '',
  city: '',
  address: ''
};

export const CLIENT_REQUIRED_FIELDS: Array<keyof ClientDraft> = [
  'businessName',
  'taxId',
  'contactName',
  'email',
  'phone',
  'city',
  'address'
];

export const CLIENT_EDITABLE_COLUMNS: Array<{
  key: ClientEditableFieldKey;
  label: string;
  minWidth: string;
}> = [
  { key: 'businessName', label: 'Razón social', minWidth: 'min-w-[18rem]' },
  { key: 'taxId', label: 'RUC', minWidth: 'min-w-[9rem]' },
  { key: 'contactName', label: 'Contacto', minWidth: 'min-w-[14rem]' },
  { key: 'contactRole', label: 'Cargo', minWidth: 'min-w-[12rem]' },
  { key: 'email', label: 'Email', minWidth: 'min-w-[16rem]' },
  { key: 'phone', label: 'Teléfono', minWidth: 'min-w-[10rem]' },
  { key: 'city', label: 'Ciudad', minWidth: 'min-w-[11rem]' },
  { key: 'address', label: 'Dirección', minWidth: 'min-w-[20rem]' }
];

export const PAGE_SIZE = 20;

const toTimestampIso = (value: unknown): string | null => {
  if (value instanceof Timestamp) return value.toDate().toISOString();

  if (isRecord(value) && 'toDate' in value) {
    const maybeToDate = value.toDate;
    if (typeof maybeToDate !== 'function') return null;
    return (maybeToDate as () => Date).call(value).toISOString();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }

  return null;
};

export const normalizeClientTaxId = (value: string): string =>
  value.trim().replaceAll(/\D/g, '');

export const normalizeClientEmail = (value: string): string =>
  value.trim().toLowerCase();

export const normalizeForCompare = (value: string): string => value.trim();

export const normalizeForSearch = (value: string): string =>
  value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim();

export const buildClientRowFromDoc = (
  id: string,
  data: Record<string, unknown>
): ClientRow => {
  const taxId = toSafeString(data.taxId);
  const email = toSafeString(data.email);

  return {
    id,
    updatedAtISO: toTimestampIso(data.updatedAt),
    businessName: toSafeString(data.businessName),
    taxId,
    contactName: toSafeString(data.contactName),
    contactRole: toSafeString(data.contactRole),
    email,
    phone: toSafeString(data.phone),
    city: toSafeString(data.city),
    address: toSafeString(data.address),
    taxIdNormalized:
      toSafeString(data.taxIdNormalized) || normalizeClientTaxId(taxId),
    emailNormalized:
      toSafeString(data.emailNormalized) || normalizeClientEmail(email)
  };
};

export const getChangedClientPatch = (
  current: ClientRow,
  original: ClientRow | undefined
): Record<ClientEditableFieldKey, string> | Record<string, never> => {
  if (!original) return {};

  const patch: Partial<Record<ClientEditableFieldKey, string>> = {};
  for (const { key } of CLIENT_EDITABLE_COLUMNS) {
    const next = normalizeForCompare(current[key]);
    const prev = normalizeForCompare(original[key]);

    if (next !== prev) {
      patch[key] = next;
    }
  }

  return patch as Record<ClientEditableFieldKey, string>;
};

export const getClientDraftFromRow = (row: ClientRow): ClientDraft => ({
  businessName: row.businessName,
  taxId: row.taxId,
  contactName: row.contactName,
  contactRole: row.contactRole,
  email: row.email,
  phone: row.phone,
  city: row.city,
  address: row.address
});

export const normalizeClientDraft = (draft: ClientDraft): ClientDraft => ({
  businessName: draft.businessName.trim(),
  taxId: draft.taxId.trim(),
  contactName: draft.contactName.trim(),
  contactRole: draft.contactRole.trim(),
  email: draft.email.trim(),
  phone: draft.phone.trim(),
  city: draft.city.trim(),
  address: draft.address.trim()
});
