import { toSafeString } from '@/lib/runtime-guards';

export const normalizeMatrixArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  for (const entry of value) {
    const normalized = toSafeString(entry).trim();
    if (!normalized) continue;
    unique.add(normalized);
  }

  return Array.from(unique);
};
