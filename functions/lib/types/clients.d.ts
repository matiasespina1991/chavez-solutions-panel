export interface ClientPayload {
    businessName: string;
    taxId: string;
    contactName: string;
    contactRole: string;
    email: string;
    phone: string;
    address: string;
    city: string;
}
export interface CreateClientRequest {
    payload?: Partial<ClientPayload>;
}
export interface CreateClientResponse {
    id: string;
}
export type ClientPatchValue = string | null;
export interface SaveClientChange {
    id: string;
    patch: Record<string, ClientPatchValue>;
    lastKnownUpdatedAt?: string | null;
}
export interface SaveClientChangesRequest {
    changes?: SaveClientChange[];
    reason?: string;
}
export interface SaveClientChangesResponse {
    updated: number;
    skipped: number;
    notFound: string[];
    conflicts: string[];
    invalid: string[];
}
export interface DeleteClientRequest {
    id?: string;
}
export interface DeleteClientResponse {
    deletedId: string;
}
export interface BackfillClientsFromRequestsResponse {
    importedCount: number;
    skippedExisting: number;
    skippedInvalid: number;
}
