import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';
import { requirePermission } from '../guards/require-permission.js';
import type {
  BackfillClientsFromRequestsResponse,
  ClientPatchValue,
  CreateClientRequest,
  CreateClientResponse,
  DeleteClientRequest,
  DeleteClientResponse,
  SaveClientChangesRequest,
  SaveClientChangesResponse,
} from '../types/clients.js';
import {
  CLIENT_FIELDS,
  dedupeClientSources,
  getClientDedupKey,
  getMissingRequiredClientFields,
  normalizeClientPayload,
  type ClientField,
  type NormalizedClientPayload,
} from '../utils/clients.js';

const db = admin.firestore();
const CLIENTS_COLLECTION = FIRESTORE_COLLECTIONS.CLIENTS;
const REQUESTS_COLLECTION = FIRESTORE_COLLECTIONS.REQUESTS;
const BATCH_LIMIT = 400;
const ALLOWED_FIELDS = new Set<string>(CLIENT_FIELDS);

const getActor = (req: Parameters<typeof requirePermission>[0]) => ({
  uid: req.auth?.uid ?? null,
  email:
    req.auth && typeof req.auth.token.email === 'string'
      ? req.auth.token.email
      : null,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toMillis = (value: unknown): number | null => {
  if (!value) return null;

  if (
    isRecord(value) &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizePatchValue = (value: unknown): ClientPatchValue => {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }

  throw new HttpsError(
    'invalid-argument',
    'Client patch values must be string | null.'
  );
};

const assertNoDuplicate = async (
  payload: NormalizedClientPayload,
  exceptId: string | null
) => {
  const checks: Array<{ field: 'taxIdNormalized' | 'emailNormalized'; value: string }> =
    [];

  if (payload.taxIdNormalized) {
    checks.push({ field: 'taxIdNormalized', value: payload.taxIdNormalized });
  }

  if (payload.emailNormalized) {
    checks.push({ field: 'emailNormalized', value: payload.emailNormalized });
  }

  for (const check of checks) {
    const snapshot = await db
      .collection(CLIENTS_COLLECTION)
      .where(check.field, '==', check.value)
      .limit(1)
      .get();

    const duplicate = snapshot.docs.find((doc) => doc.id !== exceptId);
    if (duplicate) {
      throw new HttpsError(
        'already-exists',
        `A client with the same ${check.field} already exists.`
      );
    }
  }
};

const buildClientDocument = (
  payload: NormalizedClientPayload,
  actor: ReturnType<typeof getActor>
) => ({
  businessName: payload.businessName,
  taxId: payload.taxId,
  contactName: payload.contactName,
  contactRole: payload.contactRole,
  email: payload.email,
  phone: payload.phone,
  address: payload.address,
  city: payload.city,
  taxIdNormalized: payload.taxIdNormalized,
  emailNormalized: payload.emailNormalized,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  createdBy: actor,
  updatedBy: actor,
});

const getAllDedupKeys = (payload: NormalizedClientPayload): string[] => [
  ...(payload.taxIdNormalized ? [`tax:${payload.taxIdNormalized}`] : []),
  ...(payload.emailNormalized ? [`email:${payload.emailNormalized}`] : []),
];

export const createClient = onCall(
  async (req): Promise<CreateClientResponse> => {
    await requirePermission(req, 'clients.write');
    if (!req.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    const data = (req.data ?? {}) as CreateClientRequest;
    if (!isRecord(data.payload)) {
      throw new HttpsError('invalid-argument', 'payload is required.');
    }

    const payload = normalizeClientPayload(data.payload);
    const missingFields = getMissingRequiredClientFields(payload);
    if (missingFields.length > 0) {
      throw new HttpsError(
        'invalid-argument',
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    await assertNoDuplicate(payload, null);

    const docRef = db.collection(CLIENTS_COLLECTION).doc();
    await docRef.set(buildClientDocument(payload, getActor(req)));

    return { id: docRef.id };
  }
);

export const saveClientChanges = onCall(
  async (req): Promise<SaveClientChangesResponse> => {
    await requirePermission(req, 'clients.write');
    if (!req.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    const data = (req.data ?? {}) as SaveClientChangesRequest;
    const rawChanges = Array.isArray(data.changes) ? data.changes : [];
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
          `Duplicated client id in changes payload: ${id}`
        );
      }

      dedupedIds.add(id);

      if (!isRecord(change.patch)) {
        throw new HttpsError(
          'invalid-argument',
          `patch for client ${id} must be an object.`
        );
      }

      const patch: Record<string, ClientPatchValue> = {};
      Object.entries(change.patch).forEach(([field, value]) => {
        if (!ALLOWED_FIELDS.has(field)) return;
        patch[field] = normalizePatchValue(value);
      });

      return {
        id,
        patch,
        lastKnownUpdatedAt:
          typeof change.lastKnownUpdatedAt === 'string'
            ? change.lastKnownUpdatedAt
            : null,
      };
    });

    const docRefs = normalizedChanges.map((entry) =>
      db.collection(CLIENTS_COLLECTION).doc(entry.id)
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
        const currentUpdatedAtMs = toMillis(currentData.updatedAt);
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

      const nextPayload = normalizeClientPayload({
        businessName: entry.patch.businessName ?? currentData.businessName,
        taxId: entry.patch.taxId ?? currentData.taxId,
        contactName: entry.patch.contactName ?? currentData.contactName,
        contactRole: entry.patch.contactRole ?? currentData.contactRole,
        email: entry.patch.email ?? currentData.email,
        phone: entry.patch.phone ?? currentData.phone,
        address: entry.patch.address ?? currentData.address,
        city: entry.patch.city ?? currentData.city,
      });
      const missingFields = getMissingRequiredClientFields(nextPayload);
      if (missingFields.length > 0) {
        invalid.push(entry.id);
        skipped += 1;
        continue;
      }

      await assertNoDuplicate(nextPayload, entry.id);

      const updateData: Record<string, unknown> = {};
      for (const [field, value] of patchEntries) {
        updateData[field] = value ?? '';
      }

      updateData.taxIdNormalized = nextPayload.taxIdNormalized;
      updateData.emailNormalized = nextPayload.emailNormalized;
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.updatedBy = getActor(req);

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

    return {
      updated: updatedIds.length,
      skipped,
      notFound,
      conflicts,
      invalid,
    };
  }
);

export const deleteClient = onCall(
  async (req): Promise<DeleteClientResponse> => {
    await requirePermission(req, 'clients.write');
    if (!req.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    const data = (req.data ?? {}) as DeleteClientRequest;
    const id = typeof data.id === 'string' ? data.id.trim() : '';
    if (!id) {
      throw new HttpsError('invalid-argument', 'id is required.');
    }

    const docRef = db.collection(CLIENTS_COLLECTION).doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new HttpsError('not-found', `Client ${id} was not found.`);
    }

    await docRef.delete();
    return { deletedId: id };
  }
);

export const backfillClientsFromRequests = onCall(
  async (req): Promise<BackfillClientsFromRequestsResponse> => {
    await requirePermission(req, 'clients.write');
    if (!req.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    const [requestsSnapshot, clientsSnapshot] = await Promise.all([
      db.collection(REQUESTS_COLLECTION).get(),
      db.collection(CLIENTS_COLLECTION).get(),
    ]);

    const requestClients: Array<Partial<Record<ClientField, unknown>>> = [];
    for (const doc of requestsSnapshot.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (isRecord(data.client)) {
        requestClients.push(data.client);
      }
    }

    const deduped = dedupeClientSources(requestClients);
    const existingKeys = new Set(
      clientsSnapshot.docs
        .map((doc) => normalizeClientPayload(doc.data()))
        .flatMap(getAllDedupKeys)
    );

    let batch = db.batch();
    let operationCount = 0;
    let importedCount = 0;
    let skippedExisting = 0;

    for (const payload of deduped.clients) {
      const key = getClientDedupKey(payload);
      const allKeys = getAllDedupKeys(payload);
      if (!key || allKeys.some((entry) => existingKeys.has(entry))) {
        skippedExisting += 1;
        continue;
      }

      const docRef = db.collection(CLIENTS_COLLECTION).doc();
      batch.set(docRef, buildClientDocument(payload, getActor(req)));
      allKeys.forEach((entry) => existingKeys.add(entry));
      importedCount += 1;
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

    return {
      importedCount,
      skippedExisting,
      skippedInvalid: deduped.skippedInvalid,
    };
  }
);
