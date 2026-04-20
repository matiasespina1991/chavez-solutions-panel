import type { ProformaPreviewServiceGroup, ProformaPreviewServiceLine } from './proformaPreviewPdf.js';
export interface SourceServiceLine {
    tableLabel?: string | null;
    parameterLabel?: string | null;
    parameterId?: string | null;
    unit?: string | null;
    method?: string | null;
    rangeMin?: string | null;
    rangeMax?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    discountAmount?: number | null;
}
export declare const toProformaPreviewServiceLine: (service: SourceServiceLine) => ProformaPreviewServiceLine;
export declare const mapRequestServicesToPreview: (value: unknown) => {
    services: ProformaPreviewServiceLine[];
    serviceGroups: ProformaPreviewServiceGroup[];
};
