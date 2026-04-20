export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'converted_to_work_order'
  | 'work_order_paused'
  | 'work_order_completed'
  | 'cancelled';

export type RequestApprovalStatus = 'pending' | 'approved' | 'rejected';

export type WorkOrderStatus =
  | 'issued'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'unknown';

export interface RequestServiceItem {
  serviceId: string;
  parameterId: string;
  parameterLabel: string;
  tableLabel: string | null;
  unit: string | null;
  method: string | null;
  rangeMin: string;
  rangeMax: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

export interface RequestServiceGroupItem {
  serviceId: string;
  parameterId?: string;
  parameterLabel: string;
  tableLabel?: string | null;
  unit?: string | null;
  method?: string | null;
  rangeMin?: string;
  rangeMax?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

export interface RequestServiceGroup {
  id: string;
  name: string;
  items: RequestServiceGroupItem[];
}

export interface RequestClient {
  businessName: string;
  taxId: string;
  contactName: string;
  address: string;
  city: string;
  email: string;
  phone: string;
}

export interface RequestListRow {
  id: string;
  reference: string;
  notes: string;
  isWorkOrder: boolean;
  matrix: string[];
  status: RequestStatus;
  approvalStatus: RequestApprovalStatus | null;
  approvalActorEmail?: string | null;
  approvalFeedback: string;
  validDays: number | null;
  createdAtMs: number;
  client: RequestClient;
  serviceItems: RequestServiceItem[];
  serviceGroups: RequestServiceGroup[];
  sampleItems: Array<{ sampleCode: string; sampleType: string }>;
  analysisItems: Array<{ parameterLabelEs: string; unitPrice: number }>;
  taxPercent: number;
  clientBusinessName: string;
  agreedCount: number;
  analysesCount: number;
  total: number;
  subtotal: number;
  updatedAtLabel: string;
  updatedAtMs: number;
}

export interface WorkOrderListRow {
  id: string;
  workOrderNumber: string;
  sourceReference: string;
  sourceRequestId: string;
  notes: string;
  matrix: string[];
  status: WorkOrderStatus;
  client: Pick<RequestClient, 'businessName' | 'taxId' | 'contactName'>;
  serviceItems: RequestServiceItem[];
  sampleItems: Array<{ sampleCode: string; sampleType: string }>;
  analysisItems: Array<{ parameterLabelEs: string; unitPrice: number }>;
  taxPercent: number;
  clientBusinessName: string;
  agreedCount: number;
  analysesCount: number;
  total: number;
  subtotal: number;
  updatedAtLabel: string;
  updatedAtMs: number;
}

export type TechnicalServiceCondition = 'ACREDITADO' | 'NO ACREDITADO';

export interface TechnicalServiceDocument {
  id: string;
  ID_CONFIG_PARAMETRO?: string;
  ID_CONDICION_PARAMETRO?: string;
  ID_PARAMETRO?: string;
  ID_UBICACION?: string;
  ID_MATRIZ?: string;
  ID_MAT_ENSAYO?: string;
  ID_NORMA?: string;
  ID_TABLA_NORMA?: string;
  ID_TECNICA?: string;
  ID_MET_INTERNO?: string;
  ID_MET_REFERENCIA?: string;
  UNIDAD_INTERNO?: string;
  UNIDAD_NORMA?: string;
  LIM_INF_INTERNO?: string;
  LIM_SUP_INTERNO?: string;
  LIM_INF_NORMA?: string;
  LIM_SUP_NORMA?: string;
  PRECIO?: number | null;
}

export interface TechnicalServiceCreatePayload {
  ID_CONFIG_PARAMETRO: string;
  ID_PARAMETRO: string;
  ID_CONDICION_PARAMETRO: string;
  ID_UBICACION: string;
  ID_MATRIZ: string;
  ID_MAT_ENSAYO: string;
  ID_NORMA: string;
  ID_TABLA_NORMA: string;
  ID_TECNICA: string;
  ID_MET_INTERNO: string;
  ID_MET_REFERENCIA: string;
  UNIDAD_INTERNO: string;
  UNIDAD_NORMA: string;
  LIM_INF_INTERNO: string;
  LIM_SUP_INTERNO: string;
  LIM_INF_NORMA: string;
  LIM_SUP_NORMA: string;
}
