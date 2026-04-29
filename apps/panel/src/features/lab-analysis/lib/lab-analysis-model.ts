export type WorkOrderStatus =
  | 'issued'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'unknown';

export interface WorkOrderMeta {
  id: string;
  workOrderNumber: string;
  sourceReference: string;
  status: WorkOrderStatus;
}

export interface LabAnalysisRow {
  id: string;
  parameterLabelEs: string;
  resultValue: string;
  unit: string;
  method: string;
}

export interface SaveLabAnalysisRowInput {
  parameterLabelEs: string;
  resultValue: string;
  unit: string;
  method: string;
}

export const createLocalId = () =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11));

export const createEmptyLabAnalysisRow = (): LabAnalysisRow => ({
  id: createLocalId(),
  parameterLabelEs: '',
  resultValue: '',
  unit: '',
  method: ''
});

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  issued: 'OT iniciada',
  paused: 'OT pausada',
  completed: 'OT finalizada',
  cancelled: 'OT cancelada',
  unknown: 'Estado desconocido'
};

export const parseWorkOrderStatus = (value: unknown): WorkOrderStatus => {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  if (
    normalized === 'issued' ||
    normalized === 'paused' ||
    normalized === 'completed' ||
    normalized === 'cancelled'
  ) {
    return normalized;
  }

  return 'unknown';
};
