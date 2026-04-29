export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const toArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

export const toSafeString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
};

export const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const toNullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

export const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const next = toNullableNumber(value);
  return next ?? fallback;
};
