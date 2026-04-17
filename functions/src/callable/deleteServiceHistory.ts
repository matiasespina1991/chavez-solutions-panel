import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';

const db = admin.firestore();
const HISTORY_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES_HISTORY;
const HISTORY_META_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES_HISTORY_META;
const HISTORY_META_DOC = 'current';
const BATCH_LIMIT = 400;
const DELETED_HISTORY_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES_DELETED_HISTORY;

const deleteDocuments = async (
  docRefs: FirebaseFirestore.DocumentReference[]
): Promise<void> => {
  let batch = db.batch();
  let operationCount = 0;

  for (const ref of docRefs) {
    batch.delete(ref);
    operationCount += 1;

    if (operationCount === BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
};

const copyDocuments = async (
  srcRefs: FirebaseFirestore.DocumentReference[],
  dstCollectionRef: FirebaseFirestore.CollectionReference
): Promise<void> => {
  let batch = db.batch();
  let operationCount = 0;

  for (const ref of srcRefs) {
    const snap = await ref.get();
    const dstRef = dstCollectionRef.doc(ref.id);
    batch.set(dstRef, snap.data() ?? {});
    operationCount += 1;

    if (operationCount === BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
};

export const deleteServiceHistory = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const { historyId } = req.data as { historyId?: string };

  if (!historyId || typeof historyId !== 'string') {
    throw new HttpsError('invalid-argument', 'historyId is required.');
  }

  const currentMetaDoc = await db
    .collection(HISTORY_META_COLLECTION)
    .doc(HISTORY_META_DOC)
    .get();

  const currentHistoryId = currentMetaDoc.data()?.currentHistoryId;

  if (currentHistoryId === historyId) {
    throw new HttpsError(
      'failed-precondition',
      'No se puede eliminar la versión actualmente activa.'
    );
  }

  const historyDocRef = db.collection(HISTORY_COLLECTION).doc(historyId);
  const historyDoc = await historyDocRef.get();

  if (!historyDoc.exists) {
    throw new HttpsError(
      'not-found',
      `History version ${historyId} not found.`
    );
  }

  const snapshotServices = await historyDocRef.collection('services').get();
  const serviceRefs = snapshotServices.docs.map((doc) => doc.ref);

  // Copy services to deleted history collection first
  if (serviceRefs.length) {
    const deletedServicesCollection = db
      .collection(DELETED_HISTORY_COLLECTION)
      .doc(historyId)
      .collection('services');

    try {
      await copyDocuments(serviceRefs, deletedServicesCollection);
    } catch (err) {
      throw new HttpsError(
        'internal',
        'Failed to copy services to deleted history collection.'
      );
    }

    // After successful copy, delete original service documents
    await deleteDocuments(serviceRefs);
  }

  // Copy the history document (metadata) into deleted collection with deletedAt
  try {
    await db
      .collection(DELETED_HISTORY_COLLECTION)
      .doc(historyId)
      .set({
        ...(historyDoc.data() || {}),
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  } catch (err) {
    throw new HttpsError(
      'internal',
      'Failed to copy history metadata to deleted collection.'
    );
  }

  // Finally delete the history document
  await historyDocRef.delete();

  return { deletedId: historyId };
});
