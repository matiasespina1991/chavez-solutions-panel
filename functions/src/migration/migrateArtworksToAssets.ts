import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
// import { v4 as uuidv4 } from 'uuid';

// admin.initializeApp();
const db = admin.firestore();

export const migrateArtworksToAssets = functions.https.onCall(async () => {
  const artworksSnap = await db.collection('artworks').get();
  console.log(`Found ${artworksSnap.size} artworks to migrate.`);

  for (const doc of artworksSnap.docs) {
    const old = doc.data();
    const mediaSetId = db.collection('mediasets').doc().id;
    const now = admin.firestore.Timestamp.now();

    const mediaset = {
      id: mediaSetId,
      title: old.title ?? '',
      description: old.description ?? '',
      ownerUID: old.ownerUID ?? null,
      ordering: old.ordering ?? Date.now(),
      createdAt: old.created_at ?? now,
      modifiedAt: old.modified_at ?? now,
      publishedAt: old.published_at ?? now,
      deletedAt: old.deleted_at ?? null,
    };

    await db.collection('mediasets').doc(mediaSetId).set(mediaset);

    const images = Array.isArray(old.images) ? old.images : [];
    for (const imgUrl of images) {
      const mediaId = db.collection('media').doc().id;
      const mediaDoc = {
        id: mediaId,
        mediaSetId,
        type: 'image',
        storagePath: '', // unknown
        paths: { original: imgUrl, derivatives: {} },
        downloadURL: imgUrl,
        createdAt: old.created_at ?? now,
        modifiedAt: now,
        processed: false,
      };
      await db.collection('media').doc(mediaId).set(mediaDoc);
    }
    console.log(`Migrated artwork ${doc.id} -> mediaset ${mediaSetId}`);
  }

  return { success: true, migrated: artworksSnap.size };
});
