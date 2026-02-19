export type MediaType = 'image' | 'video';

export interface AssetFile {
  storagePath: string;
  downloadURL: string | null;
  sizeBytes?: number;
}

export interface AssetPaths {
  original: AssetFile;
  derivatives: { [key: string]: AssetFile };
  poster?: AssetFile;
}

export interface MediaProcessing {
  stage: string;
  progress: number;
  updatedAt?: FirebaseFirestore.Timestamp;
}

export interface Media {
  id: string;
  mediaSetId: string | null;
  uploadId: string;
  originalFilename?: string;
  origin: {
    context: 'gallery' | 'exhibition';
    exhibitionId?: string | null;
    role?: 'gallery' | 'feature' | 'attachment';
  };
  title: string;
  description?: string;
  type: MediaType;
  storagePath: string;
  paths: AssetPaths;
  width?: number;
  height?: number;
  duration?: number; // in seconds, only for video
  mimeType?: string;
  sizeBytes?: number;
  blurHash?: string | null; // only images
  codec?: string | null; // for video (e.g. "vp9")
  bitrate?: number | null; // kbps
  createdAt: FirebaseFirestore.Timestamp;
  modifiedAt: FirebaseFirestore.Timestamp;
  deletedAt?: FirebaseFirestore.Timestamp | null;
  processed: boolean;
  processing?: MediaProcessing;
}
