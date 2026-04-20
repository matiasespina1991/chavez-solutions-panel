import type { MatrixType } from '@/types/domain';

export const normalizeMatrixArray = (value: unknown): MatrixType[] => {
  if (!Array.isArray(value)) return [];

  const unique = new Set<MatrixType>();
  value.forEach((entry) => {
    if (
      entry === 'water' ||
      entry === 'soil' ||
      entry === 'noise' ||
      entry === 'gases'
    ) {
      unique.add(entry);
    }
  });

  return Array.from(unique);
};
