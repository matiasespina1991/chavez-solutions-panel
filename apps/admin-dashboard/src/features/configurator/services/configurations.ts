import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type ConfigurationStatus = 'draft' | 'final';
export type ConfigurationType = 'proforma' | 'work_order' | 'both';
export type MatrixType = 'water' | 'soil';

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
  notes: string;
  client: ConfigurationClient;
  samples: ConfigurationSamples;
  analyses: ConfigurationAnalyses;
  pricing: ConfigurationPricing;
}

const COLLECTION_NAME = 'configurations';

export const createConfiguration = async (data: Omit<ConfigurationDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
  const newDocRef = doc(collection(db, COLLECTION_NAME));
  const docData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(newDocRef, docData);
  return newDocRef.id;
};

export const updateConfiguration = async (id: string, data: Partial<ConfigurationDocument>) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docData = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(docRef, docData);
};

export const getConfigurationById = async (id: string): Promise<ConfigurationDocument | null> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as ConfigurationDocument;
};
