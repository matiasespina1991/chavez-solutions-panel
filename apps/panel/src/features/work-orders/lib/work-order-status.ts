import { WORK_ORDER_STATUS_LABEL_MAP } from '@/lib/status-labels';
import type { WorkOrderListRow as WorkOrderRow, WorkOrderStatus } from '@/types/domain';

export const getWorkOrderStatusDisplayLabel = (row: WorkOrderRow) => {
  if (row.status === 'paused') return '⏸️ OT pausada';
  if (row.status === 'issued') return '🟢 OT iniciada';
  if (row.status === 'completed') return '✅ Finalizada';
  if (row.status === 'cancelled') return '(Cancelada)';
  return '(Estado desconocido)';
};

export const getWorkOrderStatusSearchHint = (status: WorkOrderStatus) => {
  if (status === 'paused') return 'amarillo';
  if (status === 'completed') return 'verde suave';
  if (status === 'cancelled') return 'gris';
  if (status === 'issued') return 'verde';
  return 'rojo';
};

export const getWorkOrderStatusSearchTokens = (row: WorkOrderRow) => [row.status, WORK_ORDER_STATUS_LABEL_MAP[row.status], getWorkOrderStatusSearchHint(row.status)];
