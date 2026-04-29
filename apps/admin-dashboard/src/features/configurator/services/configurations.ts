import {
  collection,
  type DocumentData,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  type UpdateData,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants/firestore';
import { normalizeMatrixArray } from '@/lib/request-normalizers';
import type {
  ConfigurationDocument,
  ConfigurationServiceGroup,
  ConfigurationServiceItem,
  ConfigurationStatus,
  ConfigurationType,
  ImportedServiceDocument,
  RequestDocument,
  RequestStatus
} from '@/features/configurator/lib/configuration-contracts';
import { mapRequestDocumentToConfiguration } from '@/features/configurator/lib/configuration-document-mappers';

export type {
  ConfigurationDocument,
  ConfigurationServiceGroup,
  ConfigurationServiceItem,
  ConfigurationStatus,
  ConfigurationType,
  ImportedServiceDocument,
  RequestDocument,
  RequestStatus
};

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

const toIsWorkOrder = (type: ConfigurationType): boolean => type === 'work_order' || type === 'both';

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
  const docData: UpdateData<DocumentData> = {
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
  };

  const shouldSyncNotesToWorkOrder =
    typeof data.notes === 'string' && Boolean(linkedWorkOrderId);

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
  return mapRequestDocumentToConfiguration(
    snapshot.id,
    {
      ...data,
      matrix: normalizeMatrixArray(data.matrix)
    },
    toConfigurationStatus(data.status)
  );
};

export const listImportedServices = async (): Promise<
  ImportedServiceDocument[]
> => {
  const snapshot = await getDocs(collection(db, SERVICES_COLLECTION));
  return snapshot.docs.map((serviceDoc) => {
    const data = serviceDoc.data();
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
