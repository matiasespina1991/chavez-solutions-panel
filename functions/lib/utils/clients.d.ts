import type { ClientPayload } from '../types/clients.js';
export declare const CLIENT_FIELDS: readonly ["businessName", "taxId", "contactName", "contactRole", "email", "phone", "address", "city"];
export declare const REQUIRED_CLIENT_FIELDS: readonly ["businessName", "taxId", "contactName", "email", "phone", "address", "city"];
export type ClientField = (typeof CLIENT_FIELDS)[number];
export interface NormalizedClientPayload extends ClientPayload {
    taxIdNormalized: string;
    emailNormalized: string;
}
export declare const normalizeClientTaxId: (value: unknown) => string;
export declare const normalizeClientEmail: (value: unknown) => string;
export declare const normalizeClientPayload: (source: Partial<Record<ClientField, unknown>>) => NormalizedClientPayload;
export declare const getMissingRequiredClientFields: (payload: NormalizedClientPayload) => string[];
export declare const getClientDedupKey: (payload: Pick<NormalizedClientPayload, "taxIdNormalized" | "emailNormalized">) => string | null;
export declare const dedupeClientSources: (sources: Array<Partial<Record<ClientField, unknown>>>) => {
    clients: NormalizedClientPayload[];
    skippedInvalid: number;
};
