import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';

const db = admin.firestore();
const ALLOWED_MATRICES = new Set(['water', 'soil', 'noise', 'gases']);

interface CollectionMigrationStats {
  updated: number;
  alreadyArray: number;
  invalidToEmpty: number;
  errors: number;
}

interface MigrationResponse {
  service_requests: CollectionMigrationStats;
  work_orders: CollectionMigrationStats;
}

const createStats = (): CollectionMigrationStats => ({
  updated: 0,
  alreadyArray: 0,
  invalidToEmpty: 0,
  errors: 0,
});

const arraysEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

const normalizeAllowedMatrixArray = (value: unknown): string[] => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized && ALLOWED_MATRICES.has(normalized) ? [normalized] : [];
  }

  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  value.forEach((entry) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim().toLowerCase();
    if (!normalized) return;
    if (!ALLOWED_MATRICES.has(normalized)) return;
    unique.add(normalized);
  });

  return Array.from(unique);
};

const migrateCollection = async (
  collectionName: 'service_requests' | 'work_orders'
): Promise<CollectionMigrationStats> => {
  const stats = createStats();
  const snapshot = await db.collection(collectionName).get();
  let batch = db.batch();
  let pendingWrites = 0;

  const commitBatch = async () => {
    if (!pendingWrites) return;
    await batch.commit();
    batch = db.batch();
    pendingWrites = 0;
  };

  for (const docSnap of snapshot.docs) {
    try {
      const value = docSnap.data() as { matrix?: unknown };
      const rawMatrix = value.matrix;
      const normalizedMatrix = normalizeAllowedMatrixArray(rawMatrix);

      const isArray = Array.isArray(rawMatrix);
      const rawArray = isArray
        ? rawMatrix.filter((entry): entry is string => typeof entry === 'string')
        : [];
      const trimmedRawArray = rawArray.map((entry) => entry.trim());

      const shouldWrite = !isArray || !arraysEqual(trimmedRawArray, normalizedMatrix);
      const invalidSourceToEmpty =
        normalizedMatrix.length === 0 &&
        ((typeof rawMatrix === 'string' && rawMatrix.trim().length > 0) ||
          (Array.isArray(rawMatrix) && rawMatrix.some((entry) => String(entry).trim().length > 0)) ||
          rawMatrix === null ||
          rawMatrix === undefined ||
          rawMatrix === '');

      if (invalidSourceToEmpty) {
        stats.invalidToEmpty += 1;
      }

      if (!shouldWrite) {
        stats.alreadyArray += 1;
        continue;
      }

      batch.update(docSnap.ref, {
        matrix: normalizedMatrix,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      pendingWrites += 1;
      stats.updated += 1;

      if (pendingWrites >= 400) {
        await commitBatch();
      }
    } catch (error) {
      stats.errors += 1;
      console.error('[migrateMatrixToArray] document migration failed', {
        collectionName,
        docId: docSnap.id,
        error,
      });
    }
  }

  await commitBatch();
  return stats;
};

export const migrateMatrixToArray = onCall(async (req): Promise<MigrationResponse> => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const [serviceRequests, workOrders] = await Promise.all([
    migrateCollection('service_requests'),
    migrateCollection('work_orders'),
  ]);

  return {
    service_requests: serviceRequests,
    work_orders: workOrders,
  };
});
