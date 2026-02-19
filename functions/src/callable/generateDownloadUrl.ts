// callable/generateDownloadUrl.ts
import { onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { ensureTokenDownloadURL } from '../utils/storage.js';
import { updateAssetDownloadURL } from '../utils/firestore.js';

const db = admin.firestore();

export const generateDownloadUrl = onCall(async (req) => {
  const auth = req.auth;
  if (!auth) throw new Error('unauthenticated');

  const mediaId = req.data?.mediaId;
  if (!mediaId) throw new Error('mediaId-required');

  const mediaRef = db.collection('media').doc(mediaId);
  const snap = await mediaRef.get();
  if (!snap.exists) throw new Error('media-not-found');
  const media = snap.data() as any;
  if (media.deletedAt) throw new Error('media-deleted');

  // If already has downloadURL, return it
  if (media.downloadURL) {
    return { downloadURL: media.downloadURL };
  }

  if (!media.paths || !media.paths.derivatives)
    throw new Error('no-derivatives');

  // choose a primary derivative: for image use webp_medium or webp_small, for video use webm_720
  let preferredPath = '';
  if (media.type === 'image') {
    preferredPath =
      media.paths.derivatives['webp_medium'] ??
      Object.values(media.paths.derivatives)[0];
  } else {
    preferredPath =
      media.paths.derivatives['webm_720'] ??
      Object.values(media.paths.derivatives)[0];
  }

  const url = await ensureTokenDownloadURL(preferredPath);
  await updateAssetDownloadURL(mediaId, url);
  return { downloadURL: url };
});
