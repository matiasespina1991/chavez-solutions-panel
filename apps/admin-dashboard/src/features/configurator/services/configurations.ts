import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants/firestore';
import { normalizeMatrixArray } from '@/lib/request-normalizers';
import type {
  MatrixType as DomainMatrixType,
  RequestApprovalStatus as DomainRequestApprovalStatus,
  RequestStatus as DomainRequestStatus,
  TechnicalServiceDocument
} from '@/types/domain';

export type ConfigurationStatus = 'draft' | 'final';
export type ConfigurationType = 'proforma' | 'work_order' | 'both';
export type MatrixType = DomainMatrixType;
export type RequestStatus = DomainRequestStatus;
export type RequestApprovalStatus = DomainRequestApprovalStatus;

export interface RequestApproval {
  status: RequestApprovalStatus;
  feedback?: string;
  approvedAt?: any;
  approvedBy?: {
    uid: string | null;
    email: string | null;
  };
  rejectedAt?: any;
  rejectedBy?: {
    uid: string | null;
    email: string | null;
  };
  updatedAt?: any;
}

export interface ConfigurationClient {
  businessName: string;
  taxId: string;
  contactName: string;
  contactRole: string | null;
  email: string;
  phone: string;
  address: string;
  city: string;
}

export interface ConfigurationSampleItem {
  sampleCode: string;
  sampleType: string;
  takenAt: Date | null;
  notes: string;
}

export interface ConfigurationSamples {
  agreedCount: number;
  additionalCount: number;
  executedCount: number;
  items: ConfigurationSampleItem[];
}

export interface ConfigurationAnalysisItem {
  parameterId: string;
  parameterLabelEs: string;
  unit: string;
  method: string;
  rangeOffered: string;
  isAccredited: boolean;
  turnaround: 'standard' | 'urgent';
  unitPrice: number | null;
  discountAmount?: number | null;
  appliesToSampleCodes: string[] | null;
}

export interface ConfigurationAnalyses {
  applyMode: 'all_samples' | 'by_sample';
  items: ConfigurationAnalysisItem[];
}

export interface ConfigurationPricing {
  currency: 'USD';
  subtotal: number | null;
  taxPercent: number | null;
  total: number | null;
  validDays: number | null;
}

export interface ConfigurationServiceItem {
  serviceId: string;
  parameterId: string;
  parameterLabel: string;
  tableLabel: string | null;
  unit: string | null;
  method: string | null;
  rangeMin: string;
  rangeMax: string;
  quantity: number;
  unitPrice: number | null;
  discountAmount: number | null;
}

export interface ConfigurationServiceGroup {
  name: string;
  items: ConfigurationServiceItem[];
}

export interface ConfigurationServices {
  items: ConfigurationServiceItem[];
  grouped: ConfigurationServiceGroup[];
}

export type ImportedServiceDocument = TechnicalServiceDocument;

export interface ConfigurationDocument {
  id?: string;
  type: ConfigurationType;
  matrix: MatrixType[];
  reference: string;
  createdAt?: any;
  updatedAt?: any;
  status: ConfigurationStatus;
  requestStatus?: RequestStatus;
  approvalStatus?: RequestApprovalStatus;
  notes: string;
  client: ConfigurationClient;
  samples: ConfigurationSamples;
  services: ConfigurationServices;
  analyses?: ConfigurationAnalyses;
  pricing: ConfigurationPricing;
}

export interface RequestDocument
  extends Omit<ConfigurationDocument, 'status'> {
  isWorkOrder: boolean;
  status: RequestStatus;
  approval?: RequestApproval | null;
  linkedWorkOrderId?: string | null;
}

const REQUESTS_COLLECTION = FIRESTORE_COLLECTIONS.REQUESTS;
const WORK_ORDER_COLLECTION = FIRESTORE_COLLECTIONS.WORK_ORDERS;
const SERVICES_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES;

const toRequestStatus = (
  status: ConfigurationStatus
): RequestStatus => {
  if (status === 'final') return 'submitted';
  return 'draft';
};

const toConfigurationStatus = (
  status: RequestStatus
): ConfigurationStatus => {
  if (
    status === 'submitted' ||
    status === 'converted_to_work_order' ||
    status === 'work_order_paused' ||
    status === 'work_order_completed'
  )
    return 'final';
  return 'draft';
};

const toIsWorkOrder = (type: ConfigurationType): boolean => {
  return type === 'work_order' || type === 'both';
};

export const createConfiguration = async (
  data: Omit<ConfigurationDocument, 'id' | 'createdAt' | 'updatedAt'>
) => {
  const newDocRef = doc(collection(db, REQUESTS_COLLECTION));
  const { type, ...restData } = data;
  const docData = {
    ...restData,
    matrix: normalizeMatrixArray(restData.matrix),
    isWorkOrder: toIsWorkOrder(type),
    status: toRequestStatus(data.status),
    ...(data.status === 'final'
      ? {
          approval: {
            status: 'pending',
            updatedAt: serverTimestamp()
          }
        }
      : {}),
    linkedWorkOrderId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(newDocRef, docData);
  return newDocRef.id;
};

export const updateConfiguration = async (
  id: string,
  data: Partial<ConfigurationDocument>
) => {
  const docRef = doc(db, REQUESTS_COLLECTION, id);
  const currentSnapshot = await getDoc(docRef);
  const currentData = currentSnapshot.exists()
    ? (currentSnapshot.data() as {
        linkedWorkOrderId?: string | null;
      })
    : null;
  const linkedWorkOrderId = currentData?.linkedWorkOrderId;
  const { type, ...restData } = data;
  const normalizedMatrix = normalizeMatrixArray(restData.matrix);
  const docData = {
    ...restData,
    ...(restData.matrix !== undefined ? { matrix: normalizedMatrix } : {}),
    ...(type ? { isWorkOrder: toIsWorkOrder(type) } : {}),
    ...(data.status ? { status: toRequestStatus(data.status) } : {}),
    ...(data.status === 'final'
      ? {
          approval: {
            status: 'pending',
            updatedAt: serverTimestamp()
          }
        }
      : {}),
    updatedAt: serverTimestamp()
  } as any;

  const shouldSyncNotesToWorkOrder =
    typeof data.notes === 'string' && !!linkedWorkOrderId;

  if (shouldSyncNotesToWorkOrder && linkedWorkOrderId) {
    const batch = writeBatch(db);
    batch.update(docRef, docData);
    batch.update(doc(db, WORK_ORDER_COLLECTION, linkedWorkOrderId), {
      notes: data.notes,
      updatedAt: serverTimestamp()
    });
    await batch.commit();
    return;
  }

  await updateDoc(docRef, docData);
};

export const getConfigurationById = async (
  id: string
): Promise<ConfigurationDocument | null> => {
  const docRef = doc(db, REQUESTS_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as RequestDocument;
  return {
    ...data,
    matrix: normalizeMatrixArray(data.matrix),
    id: snapshot.id,
    type: data.isWorkOrder ? 'both' : 'proforma',
    status: toConfigurationStatus(data.status),
    requestStatus: data.status,
    approvalStatus: data.approval?.status,
    services:
      typeof data.services === 'object' &&
      data.services !== null &&
      !Array.isArray(data.services)
        ? {
            items: Array.isArray(
              (data.services as { items?: ConfigurationServiceItem[] }).items
            )
              ? ((data.services as { items?: ConfigurationServiceItem[] })
                  .items ?? [])
              : [],
            grouped: Array.isArray(
              (data.services as { grouped?: ConfigurationServiceGroup[] })
                .grouped
            )
              ? ((data.services as { grouped?: ConfigurationServiceGroup[] })
                  .grouped ?? [])
              : []
          }
        : {
            items: Array.isArray(data.services)
              ? (data.services as unknown as ConfigurationServiceItem[])
              : [],
            grouped: []
          }
  } as ConfigurationDocument;
};

export const listImportedServices = async (): Promise<
  ImportedServiceDocument[]
> => {
  const snapshot = await getDocs(collection(db, SERVICES_COLLECTION));
  return snapshot.docs.map((serviceDoc) => {
    const data = serviceDoc.data() as Record<string, unknown>;
    const rawPrice =
      typeof data.PRECIO === 'number'
        ? data.PRECIO
        : typeof data.PRECIO === 'string' && data.PRECIO.trim()
          ? Number(data.PRECIO)
          : null;
    return {
      id: serviceDoc.id,
      ID_CONFIG_PARAMETRO:
        typeof data.ID_CONFIG_PARAMETRO === 'string'
          ? data.ID_CONFIG_PARAMETRO
          : undefined,
      ID_MATRIZ:
        typeof data.ID_MATRIZ === 'string' ? data.ID_MATRIZ : undefined,
      ID_MAT_ENSAYO:
        typeof data.ID_MAT_ENSAYO === 'string' ? data.ID_MAT_ENSAYO : undefined,
      ID_NORMA:
        typeof data.ID_NORMA === 'string' ? data.ID_NORMA : undefined,
      ID_TABLA_NORMA:
        typeof data.ID_TABLA_NORMA === 'string'
          ? data.ID_TABLA_NORMA
          : undefined,
      ID_PARAMETRO:
        typeof data.ID_PARAMETRO === 'string' ? data.ID_PARAMETRO : undefined,
      UNIDAD_NORMA:
        typeof data.UNIDAD_NORMA === 'string' ? data.UNIDAD_NORMA : undefined,
      UNIDAD_INTERNO:
        typeof data.UNIDAD_INTERNO === 'string'
          ? data.UNIDAD_INTERNO
          : undefined,
      LIM_INF_NORMA:
        typeof data.LIM_INF_NORMA === 'string'
          ? data.LIM_INF_NORMA
          : undefined,
      LIM_SUP_NORMA:
        typeof data.LIM_SUP_NORMA === 'string'
          ? data.LIM_SUP_NORMA
          : undefined,
      LIM_INF_INTERNO:
        typeof data.LIM_INF_INTERNO === 'string'
          ? data.LIM_INF_INTERNO
          : undefined,
      LIM_SUP_INTERNO:
        typeof data.LIM_SUP_INTERNO === 'string'
          ? data.LIM_SUP_INTERNO
          : undefined,
      ID_TECNICA:
        typeof data.ID_TECNICA === 'string' ? data.ID_TECNICA : undefined,
      ID_MET_REFERENCIA:
        typeof data.ID_MET_REFERENCIA === 'string'
          ? data.ID_MET_REFERENCIA
          : undefined,
      ID_MET_INTERNO:
        typeof data.ID_MET_INTERNO === 'string'
          ? data.ID_MET_INTERNO
          : undefined,
      PRECIO:
        typeof rawPrice === 'number' && Number.isFinite(rawPrice)
          ? rawPrice
          : null
    };
  });
};

interface CreateWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
}

export const createWorkOrderFromRequest = async (
  sourceRequestId: string
): Promise<CreateWorkOrderResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { sourceRequestId: string },
    CreateWorkOrderResponse
  >(functions, 'createWorkOrder');

  try {
    const result = await callable({ sourceRequestId });
    return result.data;
  } catch (error) {
    const errorMessage =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : '';

    if (
      errorMessage.includes(
        'Service request must be approved before generating a work order.'
      )
    ) {
      throw new Error(
        'La proforma debe estar aprobada antes de emitir una orden de trabajo.'
      );
    }

    throw error;
  }
};

interface ApproveProformaResponse {
  requestId: string;
  approvalStatus: 'approved';
  alreadyApproved: boolean;
}

export const approveProforma = async (
  requestId: string,
  feedback?: string
): Promise<ApproveProformaResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { requestId: string; feedback?: string },
    ApproveProformaResponse
  >(functions, 'approveProforma');
  const result = await callable({ requestId, feedback });
  return result.data;
};

interface RejectProformaResponse {
  requestId: string;
  approvalStatus: 'rejected';
}

export const rejectProforma = async (
  requestId: string,
  feedback: string
): Promise<RejectProformaResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { requestId: string; feedback: string },
    RejectProformaResponse
  >(functions, 'rejectProforma');
  const result = await callable({ requestId, feedback });
  return result.data;
};

interface PauseWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
  status: 'paused';
}

export const pauseWorkOrderFromRequest = async (
  sourceRequestId: string,
  notes?: string
): Promise<PauseWorkOrderResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { sourceRequestId: string; notes?: string },
    PauseWorkOrderResponse
  >(functions, 'pauseWorkOrder');
  const result = await callable({ sourceRequestId, notes });
  return result.data;
};

interface ResumeWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
  status: 'issued';
}

export const resumeWorkOrderFromRequest = async (
  sourceRequestId: string,
  notes?: string
): Promise<ResumeWorkOrderResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { sourceRequestId: string; notes?: string },
    ResumeWorkOrderResponse
  >(functions, 'resumeWorkOrder');
  const result = await callable({ sourceRequestId, notes });
  return result.data;
};

interface CompleteWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
  sourceRequestId: string;
  status: 'completed';
}

export const completeWorkOrder = async (
  workOrderId: string,
  sourceRequestId?: string
): Promise<CompleteWorkOrderResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { workOrderId: string; sourceRequestId?: string },
    CompleteWorkOrderResponse
  >(functions, 'completeWorkOrder');

  try {
    const result = await callable({ workOrderId, sourceRequestId });
    return result.data;
  } catch (error) {
    const errorMessage =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : '';

    if (
      errorMessage.includes(
        'Lab analysis must be recorded before completing a work order.'
      )
    ) {
      throw new Error(
        'Debe registrar análisis de laboratorio antes de finalizar la orden de trabajo.'
      );
    }

    throw error;
  }
};

interface DeleteProformaResponse {
  deletedRequestId: string;
}

export const deleteProforma = async (
  requestId: string
): Promise<DeleteProformaResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { requestId: string },
    DeleteProformaResponse
  >(functions, 'deleteProforma');
  const result = await callable({ requestId });
  return result.data;
};

export interface ProformaPreviewPdfServiceLine {
  table: string;
  label: string;
  unit: string;
  method: string;
  rangeOffered: string;
  quantity: number;
  unitPrice: number | null;
  discountAmount: number | null;
  subtotal: number | null;
}

export interface ProformaPreviewPdfServiceGroup {
  name: string;
  items: ProformaPreviewPdfServiceLine[];
}

export interface ProformaPreviewPdfPayload {
  reference: string;
  matrixLabels: string[];
  validDays: number | null;
  issuedAtLabel: string;
  validUntilLabel: string;
  client: {
    businessName: string;
    taxId: string;
    contactName: string;
    address: string;
    city: string;
    email: string;
    phone: string;
    mobile?: string;
  };
  services: ProformaPreviewPdfServiceLine[];
  serviceGroups?: ProformaPreviewPdfServiceGroup[];
  pricing: {
    subtotal: number;
    taxPercent: number;
    total: number;
  };
}

export interface ProformaPreviewLineSource {
  tableLabel?: string | null;
  label?: string | null;
  parameterId?: string | null;
  unit?: string | null;
  method?: string | null;
  rangeMin?: string | null;
  rangeMax?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  discountAmount?: number | null;
}

export const toProformaPreviewServiceLine = (
  source: ProformaPreviewLineSource
): ProformaPreviewPdfServiceLine => {
  const quantity =
    typeof source.quantity === 'number' && Number.isFinite(source.quantity)
      ? Math.max(0, source.quantity)
      : 0;
  const unitPrice =
    typeof source.unitPrice === 'number' && Number.isFinite(source.unitPrice)
      ? source.unitPrice
      : null;
  const discountAmount =
    typeof source.discountAmount === 'number' &&
    Number.isFinite(source.discountAmount)
      ? source.discountAmount
      : null;
  const subtotal =
    unitPrice !== null
      ? Math.max(0, quantity * unitPrice - (discountAmount ?? 0))
      : null;

  return {
    table: source.tableLabel || 'Sin tabla',
    label: source.label || source.parameterId || 'Servicio',
    unit: source.unit || 'Sin unidad',
    method: source.method || 'Sin método',
    rangeOffered: `${source.rangeMin || '—'} a ${source.rangeMax || '—'}`,
    quantity,
    unitPrice,
    discountAmount,
    subtotal
  };
};

interface GenerateProformaPreviewPdfResponse {
  storagePath: string;
  downloadURL: string;
  fileName: string;
}

export const generateProformaPreviewPdf = async (
  payload: ProformaPreviewPdfPayload
): Promise<GenerateProformaPreviewPdfResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { payload: ProformaPreviewPdfPayload },
    GenerateProformaPreviewPdfResponse
  >(functions, 'generateProformaPreviewPdf');
  const result = await callable({ payload });
  return result.data;
};

interface SendProformaPreviewEmailResponse {
  sent: boolean;
  to: string;
  storagePath: string;
  downloadURL: string;
  fileName: string;
}

export const sendProformaPreviewEmail = async (params: {
  to: string;
  payload: ProformaPreviewPdfPayload;
  subject?: string;
  text?: string;
}): Promise<SendProformaPreviewEmailResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    {
      to: string;
      payload: ProformaPreviewPdfPayload;
      subject?: string;
      text?: string;
    },
    SendProformaPreviewEmailResponse
  >(functions, 'sendProformaPreviewEmail');
  const result = await callable(params);
  return result.data;
};
