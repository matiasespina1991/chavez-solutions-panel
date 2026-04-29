import type { FieldValue, Timestamp } from 'firebase/firestore';
import type {
  RequestApprovalStatus as DomainRequestApprovalStatus,
  RequestStatus as DomainRequestStatus,
  TechnicalServiceDocument
} from '@/types/domain';

export type ConfigurationStatus = 'draft' | 'final';
export type ConfigurationType = 'proforma' | 'work_order' | 'both';
export type RequestStatus = DomainRequestStatus;
export type RequestApprovalStatus = DomainRequestApprovalStatus;

export type FirestoreDateValue = Timestamp | FieldValue | Date | null;

export interface RequestApproval {
  status: RequestApprovalStatus;
  feedback?: string;
  approvedAt?: FirestoreDateValue;
  approvedBy?: {
    uid: string | null;
    email: string | null;
  };
  rejectedAt?: FirestoreDateValue;
  rejectedBy?: {
    uid: string | null;
    email: string | null;
  };
  updatedAt?: FirestoreDateValue;
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
  matrix: string[];
  reference: string;
  createdAt?: FirestoreDateValue;
  updatedAt?: FirestoreDateValue;
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
