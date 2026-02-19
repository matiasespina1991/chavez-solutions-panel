export declare function createWebpVariants(localPath: string): Promise<{
    [k: string]: {
        path: string;
        width: number;
        height: number;
    };
}>;
export declare function generateBlurHash(localPath: string): Promise<string>;
