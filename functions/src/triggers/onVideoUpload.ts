// triggers/onUploadVideo.ts
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import admin from 'firebase-admin';
import fs from 'fs/promises';
import {
  downloadToTmp,
  uploadFromLocal,
  safeUnlink,
} from '../utils/storage.js';
import {
  transcodeToWebM,
  generatePoster,
  probeMetadata,
} from '../utils/ffmpeg.js';
import { createAssetDoc } from '../utils/firestore.js';
import { Media } from '../types/media.js';

function getDb() {
  return admin.firestore();
}

export const onVideoUpload = onObjectFinalized(
  {
    region: 'europe-west3',
    memory: '8GiB',
    timeoutSeconds: 2000,
    cpu: 4,
    maxInstances: 10,
  },
  async (event) => {
    const object = event.data;
    if (!object) return;

    try {
      console.log('[onVideoUpload] event received', {
        name: object.name,
        contentType: object.contentType,
        size: object.size,
        metadata: object.metadata ?? {},
      });
      const contentType = object.contentType ?? '';
      if (!contentType.startsWith('video/')) return;

      const storagePath = object.name!;
      if (!storagePath.startsWith('uploads/videos/')) return;

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
      console.log('[onVideoUpload] resolved ids', {
        mediaId,
        uploadId: resolvedUploadId,
        originalFilename,
        storagePath,
        originContext,
        originRole,
        originExhibitionId,
      });

      // Create initial doc with processed: false
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
        type: 'video',
        storagePath,
        title: '',
        description: '',
        paths: {
          original: { storagePath, downloadURL: null },
          derivatives: {},
        },
        width: 0,
        height: 0,
        duration: 0,
        mimeType: contentType,
        sizeBytes: object.size ? Number(object.size) : undefined,
        codec: null,
        bitrate: null,
        createdAt: now,
        modifiedAt: now,
        processed: false,
        processing: {
          stage: 'created',
          progress: 15,
          updatedAt: now,
        },
      };

      await createAssetDoc(initialDoc);
      console.log('[onVideoUpload] created initial doc', { mediaId });
      await updateProcessing('download_start', 20);

      const localPath = await downloadToTmp(storagePath);
      console.log('[onVideoUpload] downloaded to tmp', { mediaId, localPath });
      await updateProcessing('downloaded', 25);
      const tmpBase = '/tmp';
      const bucket = admin.storage().bucket();

      const resolutions = [
        { name: '360', height: 360 },
        { name: '720', height: 720 },
        { name: '1080', height: 1080 },
      ];

      // Probe metadata
      const meta = await probeMetadata(localPath);
      const format = meta.format || {};
      const duration = format.duration
        ? Math.round(format.duration)
        : undefined;
      console.log('[onVideoUpload] probed metadata', {
        mediaId,
        duration,
        width: meta.streams?.[0]?.width ?? null,
        height: meta.streams?.[0]?.height ?? null,
      });
      await updateProcessing('metadata', 30);

      // Generate poster
      const posterLocal = `${tmpBase}/${Date.now()}-poster.webp`;
      await generatePoster(localPath, posterLocal);
      console.log('[onVideoUpload] poster generated', { mediaId, posterLocal });
      await updateProcessing('poster_generated', 40);
      const posterStoragePath = `temp-assets/${mediaId}/poster.webp`;
      await uploadFromLocal(posterLocal, posterStoragePath, 'image/webp');
      const [posterDownloadURL] = await bucket
        .file(posterStoragePath)
        .getSignedUrl({
          action: 'read',
          expires: '03-01-2500',
        });
      console.log('[onVideoUpload] poster uploaded', {
        mediaId,
        posterStoragePath,
      });
      await updateProcessing('poster_uploaded', 50);
      await safeUnlink(posterLocal);

      // Transcode resolutions
      const derivativePaths: {
        [key: string]: {
          storagePath: string;
          downloadURL: string | null;
          sizeBytes?: number;
        };
      } = {};

      const runWithConcurrency = async <T>(
        items: T[],
        limit: number,
        worker: (item: T) => Promise<void>
      ) => {
        const queue = [...items];
        const runners = Array.from(
          { length: Math.min(limit, items.length) },
          async () => {
            while (queue.length) {
              const next = queue.shift();
              if (!next) return;
              await worker(next);
            }
          }
        );
        await Promise.all(runners);
      };

      await runWithConcurrency(resolutions, 2, async (r) => {
        const outLocal = `${tmpBase}/${Date.now()}-${r.name}.webm`;
        await transcodeToWebM(localPath, outLocal, r.height);
        const outStats = await fs.stat(outLocal).catch(() => null);
        const remotePath = `temp-assets/${mediaId}/video_${r.name}.webm`;
        await uploadFromLocal(outLocal, remotePath, 'video/webm');
        const [downloadURL] = await bucket.file(remotePath).getSignedUrl({
          action: 'read',
          expires: '03-01-2500',
        });
        derivativePaths[`webm_${r.name}`] = {
          storagePath: remotePath,
          downloadURL,
          sizeBytes: outStats?.size,
        };
        console.log('[onVideoUpload] derivative ready', {
          mediaId,
          variant: r.name,
          remotePath,
        });
        if (r.name === '360') await updateProcessing('transcode_360', 60);
        if (r.name === '720') await updateProcessing('transcode_720', 70);
        if (r.name === '1080') await updateProcessing('transcode_1080', 80);
        await safeUnlink(outLocal);
      });
      await updateProcessing('derivatives_ready', 85);

      // Delete original uploaded file (keeping storagePath for record)
      await bucket
        .file(storagePath)
        .delete()
        .catch(() => {});
      console.log('[onVideoUpload] deleted original upload', {
        mediaId,
        storagePath,
      });
      await updateProcessing('original_deleted', 90);

      // Update document with derivatives, poster, and processed: true
      await db
        .collection('media')
        .doc(mediaId)
        .update({
          'paths.derivatives': derivativePaths,
          'paths.poster': {
            storagePath: posterStoragePath,
            downloadURL: posterDownloadURL,
          },
          width: meta.streams?.[0]?.width ?? 0,
          height: meta.streams?.[0]?.height ?? 0,
          duration,
          codec: 'vp9',
          bitrate: format.bit_rate ?? null,
          modifiedAt: admin.firestore.Timestamp.now(),
          processed: true,
        } as any);
      console.log('[onVideoUpload] media doc updated', { mediaId });
      await updateProcessing('done', 100);

      await safeUnlink(localPath);
      console.log('[onVideoUpload] completed', { mediaId });
    } catch (err) {
      console.error('onVideoFinalize error:', err);
      throw err;
    }
  }
);
