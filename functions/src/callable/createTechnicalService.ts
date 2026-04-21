import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';
import type {
  CreateTechnicalServiceRequest,
  CreateTechnicalServiceResponse,
} from '../types/technical-services.js';
import { requirePermission } from '../guards/require-permission.js';

const db = admin.firestore();
const SERVICES_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES;

const REQUIRED_FIELDS = [
  'ID_CONFIG_PARAMETRO',
  'ID_PARAMETRO',
  'ID_MATRIZ',
  'ID_MAT_ENSAYO',
  'ID_NORMA',
  'ID_TABLA_NORMA',
  'ID_TECNICA',
  'UNIDAD_INTERNO',
  'UNIDAD_NORMA',
  'LIM_INF_INTERNO',
  'LIM_SUP_INTERNO',
  'LIM_INF_NORMA',
  'LIM_SUP_NORMA',
] as const;

const OPTIONAL_FIELDS = [
  'ID_CONDICION_PARAMETRO',
  'ID_UBICACION',
  'ID_MET_INTERNO',
  'ID_MET_REFERENCIA',
] as const;

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const createTechnicalService = onCall(
  async (req): Promise<CreateTechnicalServiceResponse> => {
    await requirePermission(req, 'services_catalog.write');
    if (!req.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    const data = (req.data ?? {}) as CreateTechnicalServiceRequest;
    const payload =
      data.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)
        ? data.payload
        : null;

    if (!payload) {
      throw new HttpsError('invalid-argument', 'payload is required.');
    }

    const missingFields = REQUIRED_FIELDS.filter(
      (field) => !toTrimmedString(payload[field])
    );

    if (missingFields.length > 0) {
      throw new HttpsError(
        'invalid-argument',
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    const configParamId = toTrimmedString(payload.ID_CONFIG_PARAMETRO);
    const docRef = db.collection(SERVICES_COLLECTION).doc(configParamId);
    const existing = await docRef.get();
    if (existing.exists) {
      throw new HttpsError(
        'already-exists',
        `A service with ID_CONFIG_PARAMETRO "${configParamId}" already exists.`
      );
    }

    const normalizedPayload: Record<string, string> = {};

    REQUIRED_FIELDS.forEach((field) => {
      normalizedPayload[field] = toTrimmedString(payload[field]);
    });

    OPTIONAL_FIELDS.forEach((field) => {
      normalizedPayload[field] = toTrimmedString(payload[field]);
    });

    if (!normalizedPayload.ID_CONDICION_PARAMETRO) {
      normalizedPayload.ID_CONDICION_PARAMETRO = 'ACREDITADO';
    }

    await docRef.set({
      ...normalizedPayload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: {
        uid: req.auth.uid,
        email:
          typeof req.auth.token.email === 'string' ? req.auth.token.email : null,
      },
      updatedBy: {
        uid: req.auth.uid,
        email:
          typeof req.auth.token.email === 'string' ? req.auth.token.email : null,
      },
    });

    return { id: docRef.id };
  }
);
