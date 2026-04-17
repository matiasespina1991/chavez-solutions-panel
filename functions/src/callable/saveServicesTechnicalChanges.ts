import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';
import type {
  SaveServicesTechnicalChangesRequest,
  SaveServicesTechnicalChangesResponse,
  TechnicalServicePatchValue,
} from '../types/technical-services.js';

const db = admin.firestore();
const SERVICES_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES;
const SERVICES_AUDIT_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES_AUDIT;
const BATCH_LIMIT = 400;

const ALLOWED_FIELDS = new Set([
  'ID_CONDICION_PARAMETRO',
  'ID_MATRIZ',
  'ID_MAT_ENSAYO',
  'ID_MET_INTERNO',
  'ID_MET_REFERENCIA',
  'ID_NORMA',
  'ID_PARAMETRO',
  'ID_TABLA_NORMA',
  'ID_TECNICA',
  'ID_UBICACION',
  'LIM_INF_INTERNO',
  'LIM_INF_NORMA',
  'LIM_SUP_INTERNO',
  'LIM_SUP_NORMA',
  'UNIDAD_INTERNO',
  'UNIDAD_NORMA',
  'PRECIO',
]);

const toMillis = (value: unknown): number | null => {
  if (!value) return null;

  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizePatchValue = (value: unknown): TechnicalServicePatchValue => {
  if (value === null) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new HttpsError('invalid-argument', 'Patch number is not finite.');
    }
    return value;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  throw new HttpsError(
    'invalid-argument',
    'Patch values must be string | number | null.'
  );
};

export const saveServicesTechnicalChanges = onCall(
  async (req): Promise<SaveServicesTechnicalChangesResponse> => {
    if (!req.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    const data = (req.data || {}) as SaveServicesTechnicalChangesRequest;
    const rawChanges = Array.isArray(data.changes) ? data.changes : [];
    const reason =
      typeof data.reason === 'string' && data.reason.trim().length > 0
        ? data.reason.trim()
        : null;

    if (rawChanges.length === 0) {
      throw new HttpsError('invalid-argument', 'changes is required.');
    }

    const dedupedIds = new Set<string>();
    const normalizedChanges = rawChanges.map((change) => {
      const id = typeof change.id === 'string' ? change.id.trim() : '';
      if (!id) {
        throw new HttpsError('invalid-argument', 'Each change requires an id.');
      }
      if (dedupedIds.has(id)) {
        throw new HttpsError(
          'invalid-argument',
          `Duplicated service id in changes payload: ${id}`
        );
      }
      dedupedIds.add(id);

      const patchSource = change.patch ?? {};
      if (
        typeof patchSource !== 'object' ||
        patchSource === null ||
        Array.isArray(patchSource)
      ) {
        throw new HttpsError(
          'invalid-argument',
          `patch for service ${id} must be an object.`
        );
      }

      const patch: Record<string, TechnicalServicePatchValue> = {};
      Object.entries(patchSource).forEach(([field, value]) => {
        if (!ALLOWED_FIELDS.has(field)) return;
        patch[field] = normalizePatchValue(value);
      });

      const lastKnownUpdatedAt =
        typeof change.lastKnownUpdatedAt === 'string'
          ? change.lastKnownUpdatedAt
          : null;

      return {
        id,
        patch,
        lastKnownUpdatedAt,
      };
    });

    const docRefs = normalizedChanges.map((entry) =>
      db.collection(SERVICES_COLLECTION).doc(entry.id)
    );
    const snapshots = await db.getAll(...docRefs);
    const snapshotById = new Map(
      snapshots.map((snapshot) => [snapshot.id, snapshot] as const)
    );

    let batch = db.batch();
    let operationCount = 0;

    const invalid: string[] = [];
    const notFound: string[] = [];
    const conflicts: string[] = [];
    const updatedIds: string[] = [];
    let skipped = 0;

    for (const entry of normalizedChanges) {
      const snapshot = snapshotById.get(entry.id);
      if (!snapshot || !snapshot.exists) {
        notFound.push(entry.id);
        skipped += 1;
        continue;
      }

      const patchEntries = Object.entries(entry.patch);
      if (patchEntries.length === 0) {
        invalid.push(entry.id);
        skipped += 1;
        continue;
      }

      const currentData = snapshot.data() ?? {};
      if (entry.lastKnownUpdatedAt) {
        const currentUpdatedAtMs = toMillis(
          (currentData as Record<string, unknown>).updatedAt
        );
        const clientUpdatedAtMs = toMillis(entry.lastKnownUpdatedAt);
        if (
          currentUpdatedAtMs !== null &&
          clientUpdatedAtMs !== null &&
          currentUpdatedAtMs !== clientUpdatedAtMs
        ) {
          conflicts.push(entry.id);
          skipped += 1;
          continue;
        }
      }

      const updateData: Record<string, unknown> = {};
      for (const [field, value] of patchEntries) {
        updateData[field] = value;
      }

      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.updatedBy = {
        uid: req.auth.uid,
        email:
          typeof req.auth.token.email === 'string' ? req.auth.token.email : null,
      };

      batch.update(snapshot.ref, updateData);
      updatedIds.push(entry.id);
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

    const auditRef = db.collection(SERVICES_AUDIT_COLLECTION).doc();
    await auditRef.set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      actor: {
        uid: req.auth.uid,
        email:
          typeof req.auth.token.email === 'string' ? req.auth.token.email : null,
      },
      reason,
      summary: {
        requested: normalizedChanges.length,
        updated: updatedIds.length,
        skipped,
        notFound: notFound.length,
        conflicts: conflicts.length,
        invalid: invalid.length,
      },
      updatedServiceIds: updatedIds,
      notFoundServiceIds: notFound,
      conflictServiceIds: conflicts,
      invalidServiceIds: invalid,
    });

    return {
      updated: updatedIds.length,
      skipped,
      notFound,
      conflicts,
      invalid,
      auditId: auditRef.id,
    };
  }
);
