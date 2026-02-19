/**
 * Download a storage file to local /tmp path.
 */
export declare function downloadToTmp(storagePath: string): Promise<string>;
export declare function uploadFromLocal(localPath: string, destStoragePath: string, contentType?: string): Promise<void>;
export declare function ensureTokenDownloadURL(storagePath: string): Promise<string>;
export declare function safeUnlink(localPath: string): Promise<void>;
