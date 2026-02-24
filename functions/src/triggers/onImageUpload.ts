// triggers/onUploadImage.ts
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import admin from 'firebase-admin';
import fs from 'fs/promises';
import {
  downloadToTmp,
  uploadFromLocal,
  safeUnlink,
} from '../utils/storage.js';
import {
  createWebpVariants,
  // , generateBlurHash
} from '../utils/images.js';
import { createAssetDoc } from '../utils/firestore.js';
import { Media } from '../types/media.js';

function getDb() {
  return admin.firestore();
}

export const onImageUpload = onObjectFinalized(
  {
    region: 'europe-west3',
    timeoutSeconds: 540,
    memory: '2GiB',
    cpu: 1,
    maxInstances: 10,
  },
  async (event) => {
    const object = event.data;
    if (!object) return;

    try {
      console.log('[onImageUpload] event received', {
        name: object.name,
        contentType: object.contentType,
        size: object.size,
        metadata: object.metadata ?? {},
      });
      const contentType = object.contentType ?? '';
      if (!contentType.startsWith('image/')) return;

      const storagePath = object.name!;
      if (!storagePath.startsWith('uploads/images/')) return;

      const metadata = object.metadata ?? {};
      const uploadId = metadata.uploadId ?? metadata.upload_id ?? '';
      const pathFilename = storagePath.split('/').pop() ?? '';
      const originalFilenameRaw =
        metadata.originalFilename ?? metadata.original_filename ?? pathFilename;
      const originalFilename =
        typeof originalFilenameRaw === 'string' && originalFilenameRaw.trim()
          ? originalFilenameRaw
          : pathFilename;
      const originContext =
        metadata.originContext === 'exhibition' ? 'exhibition' : 'gallery';
      const originRoleRaw = metadata.originRole ?? metadata.role ?? '';
      const originRole =
        originRoleRaw === 'feature' || originRoleRaw === 'attachment'
          ? originRoleRaw
          : originContext === 'exhibition'
            ? 'attachment'
            : 'gallery';
      const originExhibitionId = metadata.exhibitionId ?? null;

      const db = getDb();
      const resolvedUploadId = typeof uploadId === 'string' ? uploadId : '';
      const mediaId = resolvedUploadId || db.collection('media').doc().id;

      const now = admin.firestore.Timestamp.now();
      const updateProcessing = async (stage: string, progress: number) => {
        await db
          .collection('media')
          .doc(mediaId)
          .set(
            {
              processing: {
                stage,
                progress,
                updatedAt: admin.firestore.Timestamp.now(),
              },
            },
            { merge: true }
          );
      };
      console.log('[onImageUpload] resolved ids', {
        mediaId,
        uploadId: resolvedUploadId,
        originalFilename,
        storagePath,
        originContext,
        originRole,
        originExhibitionId,
      });

      // Create initial document so frontend can show processing state.
      // original.downloadURL is intentionally null so frontend can display progress.
      const initialDoc: Media = {
        id: mediaId,
        mediaSetId: null,
        uploadId: resolvedUploadId || mediaId,
        originalFilename,
        origin: {
          context: originContext,
          exhibitionId: originExhibitionId,
          role: originRole,
        },
        title: '',
        description: '',
        type: 'image',
        storagePath,
        paths: {
          original: { storagePath, downloadURL: null },
          derivatives: {},
        },
        width: 0,
        height: 0,
        sizeBytes: object.size ? Number(object.size) : undefined,
        blurHash: null,
        mimeType: contentType,
        createdAt: now,
        modifiedAt: now,
        processed: false,
        processing: {
          stage: 'created',
          progress: 20,
          updatedAt: now,
        },
      };

      // Persist the initial doc immediately.
      await createAssetDoc(initialDoc);
      console.log('[onImageUpload] created initial doc', { mediaId });
      await updateProcessing('download_start', 30);

      // Download original to tmp for processing
      const localPath = await downloadToTmp(storagePath);
      console.log('[onImageUpload] downloaded to tmp', { mediaId, localPath });
      await updateProcessing('downloaded', 35);

      try {
        // Generate WebP variants
        const variants = await createWebpVariants(localPath);
        console.log('[onImageUpload] variants created', {
          mediaId,
          keys: Object.keys(variants),
        });
        await updateProcessing('variants_ready', 55);

        const bucket = admin.storage().bucket();
        const derivativePaths: {
          [k: string]: {
            storagePath: string;
            downloadURL: string;
            sizeBytes?: number;
          };
        } = {};

        // Upload each variant and create signed URL
        for (const [key, info] of Object.entries(variants)) {
          const variantStats = await fs.stat(info.path).catch(() => null);
          const dest = `temp-assets/${mediaId}/${key}.webp`;
          await uploadFromLocal(info.path, dest, 'image/webp');

          const [url] = await bucket.file(dest).getSignedUrl({
            action: 'read',
            expires: '03-01-2500',
          });

          derivativePaths[key] = {
            storagePath: dest,
            downloadURL: url,
            sizeBytes: variantStats?.size,
          };
          console.log('[onImageUpload] derivative uploaded', {
            mediaId,
            key,
            dest,
          });
          await safeUnlink(info.path);
        }
        await updateProcessing('derivatives_ready', 75);

        // Optionally delete the original uploaded file from storage
        // keep the storagePath in the doc so you have a record of the input
        await bucket
          .file(storagePath)
          .delete()
          .catch(() => {});
        console.log('[onImageUpload] deleted original upload', {
          mediaId,
          storagePath,
        });
        await updateProcessing('original_deleted', 85);

        const updatePayload: Partial<Media> = {
          paths: {
            original: initialDoc.paths.original,
            derivatives: derivativePaths,
          },
          width: variants['webp_large']?.width ?? initialDoc.width,
          height: variants['webp_large']?.height ?? initialDoc.height,
          modifiedAt: admin.firestore.Timestamp.now(),
          processed: true,
        };

        await db
          .collection('media')
          .doc(mediaId)
          .set(updatePayload, { merge: true });
        console.log('[onImageUpload] media doc updated', { mediaId });
        await updateProcessing('done', 100);
      } finally {
        // Always try to unlink the downloaded original local file
        await safeUnlink(localPath).catch(() => {});
        console.log('[onImageUpload] completed', { mediaId });
      }
    } catch (err) {
      console.error('onImageFinalize error:', err);
      // Let function fail so functions logs show the error; initial doc remains with processed:false
      throw err;
    }
  }
);
