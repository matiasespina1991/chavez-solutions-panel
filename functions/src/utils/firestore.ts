// utils/firestore.ts
import admin from 'firebase-admin';
import { Media } from '../types/media.js';

function getDb() {
  return admin.firestore();
}

export async function createAssetDoc(media: Media) {
  const ref = getDb().collection('media').doc(media.id);
  await ref.set(media, { merge: false });
}

export async function updateAssetDownloadURL(
  mediaId: string,
  downloadURL: string
) {
  const ref = getDb().collection('media').doc(mediaId);
  await ref.update({
    downloadURL,
    modifiedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
