import { v4 as uuidv4 } from 'uuid';
import { ref, uploadBytesResumable } from 'firebase/storage';
import {
  collection,
  limit,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';

export type MediaOriginContext = 'gallery' | 'exhibition';
export type MediaOriginRole = 'gallery' | 'feature' | 'attachment';

export type MediaOrigin = {
  context: MediaOriginContext;
  role?: MediaOriginRole;
  exhibitionId?: string | null;
};

export type UploadResult = {
  uploadId: string;
  storagePath: string;
  fileName: string;
};

export type MediaDoc = {
  id: string;
  type: 'image' | 'video';
  uploadId: string;
  originalFilename?: string;
  title?: string;
  createdAt?: unknown;
  deletedAt?: unknown | null;
  origin: {
    context: MediaOriginContext;
    exhibitionId?: string | null;
    role?: MediaOriginRole;
  };
  processed: boolean;
  processing?: {
    stage?: string;
    progress?: number;
    updatedAt?: unknown;
  };
  paths?: {
    original?: {
      storagePath?: string | null;
      downloadURL?: string | null;
      sizeBytes?: number;
    };
    derivatives?: Record<
      string,
      {
        storagePath?: string | null;
        downloadURL?: string | null;
        sizeBytes?: number;
      }
    >;
    poster?: {
      storagePath?: string | null;
      downloadURL?: string | null;
      sizeBytes?: number;
    };
  };
  sizeBytes?: number;
};

type ProgressHandler = (fileName: string, progress: number) => void;

function sanitizeFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 80);
}

function resolveOriginRole(origin: MediaOrigin) {
  if (origin.role) return origin.role;
  return origin.context === 'exhibition' ? 'attachment' : 'gallery';
}

export async function uploadMediaFiles(
  files: File[],
  origin: MediaOrigin,
  onProgress?: ProgressHandler
) {
  const uploads = files.map(
    (file) =>
      new Promise<UploadResult>((resolve, reject) => {
        const uploadId = uuidv4();
        const safeName = sanitizeFileName(file.name) || 'file';
        const timestamp = Date.now().toString();
        const bucketFolder = file.type.startsWith('video/')
          ? 'uploads/videos'
          : 'uploads/images';
        const storagePath = `${bucketFolder}/${timestamp}/${safeName}`;
        const metadata = {
          contentType: file.type,
          customMetadata: {
            uploadId,
            originalFilename: file.name,
            originContext: origin.context,
            originRole: resolveOriginRole(origin),
            exhibitionId: origin.exhibitionId ?? ''
          }
        };

        const task = uploadBytesResumable(
          ref(storage, storagePath),
          file,
          metadata
        );

        task.on(
          'state_changed',
          (snapshot) => {
            if (!snapshot.totalBytes) return;
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            onProgress?.(file.name, progress);
          },
          (error) => {
            reject(error);
          },
          () => {
            onProgress?.(file.name, 100);
            resolve({
              uploadId,
              storagePath,
              fileName: file.name
            });
          }
        );
      })
  );

  return Promise.all(uploads);
}

export function waitForMediaByUploadId(
  uploadId: string,
  {
    requireProcessed = false,
    timeoutMs = 120_000
  }: { requireProcessed?: boolean; timeoutMs?: number } = {}
) {
  return new Promise<MediaDoc>((resolve, reject) => {
    const mediaQuery = query(
      collection(db, 'media'),
      where('uploadId', '==', uploadId),
      limit(1)
    );

    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timed out waiting for media processing.'));
    }, timeoutMs);

    const unsubscribe = onSnapshot(
      mediaQuery,
      (snapshot) => {
        const docSnap = snapshot.docs[0];
        if (!docSnap) return;
        const data = docSnap.data() as Omit<MediaDoc, 'id'>;
        if (requireProcessed && !data.processed) return;
        clearTimeout(timeout);
        unsubscribe();
        resolve({ id: docSnap.id, ...data });
      },
      (error) => {
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      }
    );
  });
}
