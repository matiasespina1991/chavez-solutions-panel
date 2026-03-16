import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';

const db = admin.firestore();
const SERVICES_COLLECTION = 'services';
const HISTORY_COLLECTION = 'services_history';
const HISTORY_META_COLLECTION = 'services_history_meta';
const HISTORY_META_DOC = 'current';
const BATCH_LIMIT = 400;

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

export const restoreServiceHistory = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const { historyId } = req.data as { historyId?: string };

  if (!historyId || typeof historyId !== 'string') {
    throw new HttpsError('invalid-argument', 'historyId is required.');
  }

  const sourceHistoryRef = db.collection(HISTORY_COLLECTION).doc(historyId);
  const sourceHistory = await sourceHistoryRef.get();

  if (!sourceHistory.exists) {
    throw new HttpsError(
      'not-found',
      `History version ${historyId} not found.`
    );
  }

  const snapshotServices = await sourceHistoryRef.collection('services').get();

  if (snapshotServices.empty) {
    throw new HttpsError(
      'not-found',
      `History version ${historyId} has no service records.`
    );
  }

  const currentServices = await db.collection(SERVICES_COLLECTION).get();

  // Replace current services with historical snapshot
  const currentRefs = currentServices.docs.map((doc) => doc.ref);
  await deleteDocuments(currentRefs);

  let batch = db.batch();
  let operationCount = 0;

  for (const doc of snapshotServices.docs) {
    batch.set(db.collection(SERVICES_COLLECTION).doc(doc.id), doc.data());
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

  // Set current history pointer
  await db
    .collection(HISTORY_META_COLLECTION)
    .doc(HISTORY_META_DOC)
    .set({ currentHistoryId: historyId }, { merge: true });

  return {
    restoredId: historyId,
    restoredCount: snapshotServices.size,
  };
});
