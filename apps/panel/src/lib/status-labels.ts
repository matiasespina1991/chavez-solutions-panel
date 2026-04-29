import type { RequestStatus, WorkOrderStatus } from '@/types/domain';

export const REQUEST_STATUS_LABEL_MAP: Record<RequestStatus, string> = {
  draft: '(Borrador)',
  submitted: 'Proforma enviada',
  converted_to_work_order: 'OT emitida',
  work_order_paused: 'OT pausada',
  work_order_completed: 'OT finalizada',
  cancelled: 'Solicitud cancelada'
};

export const WORK_ORDER_STATUS_LABEL_MAP: Record<WorkOrderStatus, string> = {
  issued: 'OT emitida',
  paused: 'OT pausada',
  completed: 'OT finalizada',
  cancelled: 'OT cancelada',
  unknown: 'Estado desconocido'
};
