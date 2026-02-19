import { Media } from '../types/media.js';
export declare function createAssetDoc(media: Media): Promise<void>;
export declare function updateAssetDownloadURL(mediaId: string, downloadURL: string): Promise<void>;
