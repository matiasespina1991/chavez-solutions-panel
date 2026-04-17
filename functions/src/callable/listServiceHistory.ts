import { onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';

const db = admin.firestore();
const HISTORY_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES_HISTORY;
const HISTORY_META_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES_HISTORY_META;
const HISTORY_META_DOC = 'current';

export const listServiceHistory = onCall(async () => {
  const currentMetaDoc = await db
    .collection(HISTORY_META_COLLECTION)
    .doc(HISTORY_META_DOC)
    .get();

  const currentHistoryId = currentMetaDoc.data()?.currentHistoryId ?? null;

  const historySnapshot = await db
    .collection(HISTORY_COLLECTION)
    .orderBy('createdAt', 'desc')
    .get();

  const entries = historySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      createdAt: data.createdAt?.toDate?.()
        ? data.createdAt.toDate().toISOString()
        : null,
      fileName: data.fileName ?? null,
      serviceCount: data.serviceCount ?? 0,
      isCurrent: doc.id === currentHistoryId,
    };
  });

  return { entries, currentHistoryId };
});
