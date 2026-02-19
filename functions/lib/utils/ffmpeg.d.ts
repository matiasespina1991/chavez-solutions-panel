export declare function transcodeToWebM(inputPath: string, outputPath: string, height: number): Promise<void>;
/**
 * Generate single thumbnail (poster)from video at time 1s
 */
export declare function generatePoster(inputPath: string, outputPath: string): Promise<void>;
/**
 * Extract metadata (duration, codec, bitrate, width/height)
 */
export declare function probeMetadata(inputPath: string): Promise<any>;
