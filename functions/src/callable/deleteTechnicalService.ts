import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';

const db = admin.firestore();
const SERVICES_COLLECTION = 'services';

interface DeleteTechnicalServiceRequest {
  id?: string;
}

interface DeleteTechnicalServiceResponse {
  deletedId: string;
}

export const deleteTechnicalService = onCall(
  async (req): Promise<DeleteTechnicalServiceResponse> => {
    if (!req.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    const data = (req.data ?? {}) as DeleteTechnicalServiceRequest;
    const id = typeof data.id === 'string' ? data.id.trim() : '';

    if (!id) {
      throw new HttpsError('invalid-argument', 'id is required.');
    }

    const docRef = db.collection(SERVICES_COLLECTION).doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new HttpsError('not-found', `Service "${id}" not found.`);
    }

    await docRef.delete();

    return { deletedId: id };
  }
);

