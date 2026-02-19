// callable/validateDelete.ts
import { onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
const db = admin.firestore();

export const validateDelete = onCall(async (req) => {
  const auth = req.auth;
  if (!auth) throw new Error('unauthenticated');
  const mediaId = req.data?.mediaId;
  if (!mediaId) throw new Error('mediaId-required');

  // Check if media is referenced by any MediaSet (we store mediaSetId on Media)
  const mediaRef = db.collection('media').doc(mediaId);
  const mediaSnap = await mediaRef.get();
  if (!mediaSnap.exists) throw new Error('media-not-found');

  const media = mediaSnap.data() as any;
  if (media.mediaSetId) {
    // check mediaset exists and not deleted
    const msSnap = await db.collection('mediasets').doc(media.mediaSetId).get();
    if (msSnap.exists && !msSnap.data()?.deletedAt) {
      // referenced -> cannot delete
      return { allowed: false, reason: 'media-referenced-by-mediaset' };
    }
  }

  // No active references: proceed to soft-delete
  await mediaRef.update({
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    modifiedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { allowed: true };
});
