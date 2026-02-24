import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';

export type ConfigurationStatus = 'draft' | 'final';
export type ConfigurationType = 'proforma' | 'work_order' | 'both';
export type MatrixType = 'water' | 'soil';
export type ServiceRequestStatus =
  | 'draft'
  | 'submitted'
  | 'converted_to_work_order'
  | 'work_order_paused'
  | 'cancelled';

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

export interface ConfigurationDocument {
  id?: string;
  type: ConfigurationType;
  matrix: MatrixType;
  reference: string;
  createdAt?: any;
  updatedAt?: any;
  status: ConfigurationStatus;
  serviceRequestStatus?: ServiceRequestStatus;
  notes: string;
  client: ConfigurationClient;
  samples: ConfigurationSamples;
  analyses: ConfigurationAnalyses;
  pricing: ConfigurationPricing;
}

export interface ServiceRequestDocument
  extends Omit<ConfigurationDocument, 'status'> {
  isWorkOrder: boolean;
  status: ServiceRequestStatus;
  linkedWorkOrderId?: string | null;
}

const SERVICE_REQUEST_COLLECTION = 'service_requests';

const toServiceRequestStatus = (
  status: ConfigurationStatus
): ServiceRequestStatus => {
  if (status === 'final') return 'submitted';
  return 'draft';
};

const toConfigurationStatus = (
  status: ServiceRequestStatus
): ConfigurationStatus => {
  if (
    status === 'submitted' ||
    status === 'converted_to_work_order' ||
    status === 'work_order_paused'
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
  const newDocRef = doc(collection(db, SERVICE_REQUEST_COLLECTION));
  const { type, serviceRequestStatus, ...restData } = data;
  const docData = {
    ...restData,
    isWorkOrder: toIsWorkOrder(type),
    status: toServiceRequestStatus(data.status),
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
  const docRef = doc(db, SERVICE_REQUEST_COLLECTION, id);
  const { type, serviceRequestStatus, ...restData } = data;
  const docData = {
    ...restData,
    ...(type ? { isWorkOrder: toIsWorkOrder(type) } : {}),
    ...(data.status ? { status: toServiceRequestStatus(data.status) } : {}),
    updatedAt: serverTimestamp()
  };
  await updateDoc(docRef, docData);
};

export const getConfigurationById = async (
  id: string
): Promise<ConfigurationDocument | null> => {
  const docRef = doc(db, SERVICE_REQUEST_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as ServiceRequestDocument;
  return {
    ...data,
    id: snapshot.id,
    type: data.isWorkOrder ? 'both' : 'proforma',
    status: toConfigurationStatus(data.status),
    serviceRequestStatus: data.status
  } as ConfigurationDocument;
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
    { sourceRequestId: string; forceEmit?: boolean },
    CreateWorkOrderResponse
  >(functions, 'createWorkOrder');
  const result = await callable({ sourceRequestId, forceEmit: true });
  return result.data;
};

interface PauseWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
  status: 'paused';
}

export const pauseWorkOrderFromRequest = async (
  sourceRequestId: string
): Promise<PauseWorkOrderResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { sourceRequestId: string },
    PauseWorkOrderResponse
  >(functions, 'pauseWorkOrder');
  const result = await callable({ sourceRequestId });
  return result.data;
};

interface ResumeWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
  status: 'issued';
}

export const resumeWorkOrderFromRequest = async (
  sourceRequestId: string
): Promise<ResumeWorkOrderResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { sourceRequestId: string },
    ResumeWorkOrderResponse
  >(functions, 'resumeWorkOrder');
  const result = await callable({ sourceRequestId });
  return result.data;
};

interface DeleteServiceRequestResponse {
  deletedRequestId: string;
}

export const deleteServiceRequest = async (
  sourceRequestId: string
): Promise<DeleteServiceRequestResponse> => {
  const functions = getFunctions();
  const callable = httpsCallable<
    { sourceRequestId: string },
    DeleteServiceRequestResponse
  >(functions, 'deleteServiceRequest');
  const result = await callable({ sourceRequestId });
  return result.data;
};
