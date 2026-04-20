export const MATRIX_LABELS: Record<string, string> = {
  water: 'Agua',
  soil: 'Suelo',
  noise: 'Ruido',
  gases: 'Gases'
};

const ALLOWED_MATRICES = new Set(Object.keys(MATRIX_LABELS));

export const normalizeMatrixArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();

  value.forEach((entry) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim().toLowerCase();
    if (!normalized || !ALLOWED_MATRICES.has(normalized)) return;
    unique.add(normalized);
  });

  return Array.from(unique);
};

export const matrixKeyToLabel = (value: unknown): string => {
  const key = String(value || '').trim().toLowerCase();
  return MATRIX_LABELS[key] ?? String(value || '').trim();
};

export const formatMatrixLabel = (matrix: string[]): string =>
  matrix.length ? matrix.map(matrixKeyToLabel).join(', ') : '—';
