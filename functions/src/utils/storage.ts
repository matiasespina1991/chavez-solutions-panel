import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

function getBucket() {
  return admin.storage().bucket();
}

/**
 * Download a storage file to local /tmp path.
 */
export async function downloadToTmp(storagePath: string): Promise<string> {
  const tmpDir = '/tmp';
  const filename = path.basename(storagePath);
  const localPath = path.join(tmpDir, `${Date.now()}-${filename}`);
  const file = getBucket().file(storagePath);
  await file.download({ destination: localPath });
  return localPath;
}

export async function uploadFromLocal(
  localPath: string,
  destStoragePath: string,
  contentType?: string
) {
  const options: any = { destination: destStoragePath };
  if (contentType) options.metadata = { contentType };
  await getBucket().upload(localPath, options);
}

export async function ensureTokenDownloadURL(
  storagePath: string
): Promise<string> {
  const file = getBucket().file(storagePath);
  const [meta] = await file.getMetadata().catch(() => [null]);
  if (!meta) throw new Error('file-not-found');

  const existingToken = meta.metadata?.firebaseStorageDownloadTokens ?? null;

  const token = existingToken ?? uuidv4();

  if (!existingToken) {
    const newMeta = {
      ...meta,
      metadata: {
        ...(meta.metadata || {}),
        firebaseStorageDownloadTokens: token,
      },
    };
    await file.setMetadata(newMeta);
  }

  const encodedPath = encodeURIComponent(storagePath);
  const bucketName = getBucket().name;
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
}

export async function safeUnlink(localPath: string) {
  try {
    await fs.unlink(localPath);
  } catch {}
}
