interface ProformaPreviewClient {
    businessName: string;
    taxId: string;
    contactName: string;
    address: string;
    city: string;
    email: string;
    phone: string;
    mobile?: string;
}
interface ProformaPreviewServiceLine {
    label: string;
    unit: string;
    method: string;
    rangeOffered: string;
    quantity: number;
    unitPrice: number | null;
    discountAmount: number | null;
    subtotal: number | null;
}
export interface ProformaPreviewPayload {
    reference: string;
    matrixLabels: string[];
    validDays: number | null;
    issuedAtLabel: string;
    validUntilLabel: string;
    client: ProformaPreviewClient;
    services: ProformaPreviewServiceLine[];
    pricing: {
        subtotal: number;
        taxPercent: number;
        total: number;
    };
}
export declare const sanitizeProformaPreviewPayload: (payload: Partial<ProformaPreviewPayload> | undefined) => ProformaPreviewPayload;
export declare const generateAndStoreProformaPreviewPdf: (params: {
    uid: string;
    payload: ProformaPreviewPayload;
}) => Promise<{
    storagePath: string;
    downloadURL: string;
    fileName: string;
}>;
export {};
