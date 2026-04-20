import type { MatrixType } from '@/types/domain';

export const MATRIX_LABELS: Record<MatrixType, string> = {
  water: 'Agua',
  soil: 'Suelo',
  noise: 'Ruido',
  gases: 'Gases'
};

export const toMatrixLabel = (matrix: MatrixType): string =>
  MATRIX_LABELS[matrix] ?? matrix;

export const formatMatrixLabelList = (matrix: MatrixType[]): string =>
  matrix.length ? matrix.map(toMatrixLabel).join(', ') : '—';
