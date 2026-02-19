// callable/regenerateDownloadUrl.ts
import { onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
const db = admin.firestore();
const bucket = admin.storage().bucket();

export const regenerateDownloadUrl = onCall(async (req) => {
  const auth = req.auth;
  if (!auth) throw new Error('unauthenticated');
  const mediaId = req.data?.mediaId;
  if (!mediaId) throw new Error('mediaId-required');

  const mediaRef = db.collection('media').doc(mediaId);
  const snap = await mediaRef.get();
  if (!snap.exists) throw new Error('media-not-found');
  const media = snap.data() as any;
  if (!media.paths || !media.paths.derivatives)
    throw new Error('no-derivatives');

  const preferredPath =
    media.type === 'image'
      ? (media.paths.derivatives['webp_medium'] ??
        Object.values(media.paths.derivatives)[0])
      : (media.paths.derivatives['webm_720'] ??
        Object.values(media.paths.derivatives)[0]);

  // Create new token and set metadata
  const file = bucket.file(preferredPath);
  // set a new token
  const newToken = uuidv4();
  const [meta] = await file.getMetadata();
  const newMeta = meta;
  newMeta.metadata = {
    ...(newMeta.metadata || {}),
    firebaseStorageDownloadTokens: newToken,
  };
  await file.setMetadata(newMeta);

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(preferredPath)}?alt=media&token=${newToken}`;

  await mediaRef.update({
    downloadURL: url,
    modifiedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { downloadURL: url };
});
