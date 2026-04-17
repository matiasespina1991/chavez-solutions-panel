export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'converted_to_work_order'
  | 'work_order_paused'
  | 'work_order_completed'
  | 'cancelled';

export type RequestApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface RequestApprovalData {
  status?: RequestApprovalStatus;
}

export interface LinkedWorkOrderRequestData {
  linkedWorkOrderId?: string | null;
  isWorkOrder?: boolean;
}

export interface ProformaRequestData extends LinkedWorkOrderRequestData {
  status?: RequestStatus;
  approval?: RequestApprovalData | null;
}

export interface RequestDocumentData extends ProformaRequestData {
  matrix?: string[];
  reference?: string;
  notes?: string;
  client?: unknown;
  samples?: unknown;
  services?: unknown;
  pricing?: unknown;
}
