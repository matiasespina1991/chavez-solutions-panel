interface SaveServicesTechnicalChangesResponse {
    updated: number;
    skipped: number;
    notFound: string[];
    conflicts: string[];
    invalid: string[];
    auditId: string;
}
export declare const saveServicesTechnicalChanges: import("firebase-functions/v2/https").CallableFunction<any, Promise<SaveServicesTechnicalChangesResponse>, unknown>;
export {};
