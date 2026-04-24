export const normalizeMatrixArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const normalized = entry.trim();
    if (!normalized) continue;
    unique.add(normalized);
  }

  return Array.from(unique);
};
