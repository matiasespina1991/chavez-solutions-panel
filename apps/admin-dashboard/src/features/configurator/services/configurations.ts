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
import {
  isRecord,
  toNullableNumber,
  toOptionalString
} from '@/lib/runtime-guards';
import type {
  ConfigurationDocument,
  ConfigurationServiceGroup,
  ConfigurationServiceItem,
  ConfigurationStatus,
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

export const createConfiguration = async (
  data: Omit<ConfigurationDocument, 'id' | 'createdAt' | 'updatedAt'>
) => {
  const newDocRef = doc(collection(db, REQUESTS_COLLECTION));
  const restData = data;
  const docData = {
    ...restData,
    matrix: normalizeMatrixArray(restData.matrix),
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
  const restData = data;
  const normalizedMatrix = normalizeMatrixArray(restData.matrix);
  const docData: UpdateData<DocumentData> = {
    ...restData,
    ...(restData.matrix !== undefined ? { matrix: normalizedMatrix } : {}),
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
    const rawPrice = toNullableNumber(data.PRECIO);
    const source = isRecord(data) ? data : {};
    return {
      id: serviceDoc.id,
      ID_CONFIG_PARAMETRO: toOptionalString(source.ID_CONFIG_PARAMETRO),
      ID_MATRIZ: toOptionalString(source.ID_MATRIZ),
      ID_MAT_ENSAYO: toOptionalString(source.ID_MAT_ENSAYO),
      ID_NORMA: toOptionalString(source.ID_NORMA),
      ID_TABLA_NORMA: toOptionalString(source.ID_TABLA_NORMA),
      ID_PARAMETRO: toOptionalString(source.ID_PARAMETRO),
      UNIDAD_NORMA: toOptionalString(source.UNIDAD_NORMA),
      UNIDAD_INTERNO: toOptionalString(source.UNIDAD_INTERNO),
      LIM_INF_NORMA: toOptionalString(source.LIM_INF_NORMA),
      LIM_SUP_NORMA: toOptionalString(source.LIM_SUP_NORMA),
      LIM_INF_INTERNO: toOptionalString(source.LIM_INF_INTERNO),
      LIM_SUP_INTERNO: toOptionalString(source.LIM_SUP_INTERNO),
      ID_TECNICA: toOptionalString(source.ID_TECNICA),
      ID_MET_REFERENCIA: toOptionalString(source.ID_MET_REFERENCIA),
      ID_MET_INTERNO: toOptionalString(source.ID_MET_INTERNO),
      PRECIO: rawPrice
    };
  });
};
