export interface ServiceRequestPdfSource {
    id: string;
    reference?: string | null;
    matrix?: string | null;
    pricing?: {
        total?: number | null;
    } | null;
    client?: {
        businessName?: string | null;
    } | null;
}
export declare const generateAndStoreProformaPdf: (source: ServiceRequestPdfSource) => Promise<{
    storagePath: string;
    downloadURL: string;
    fileName: string;
}>;
