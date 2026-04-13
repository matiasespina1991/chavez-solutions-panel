export declare const migrateServiceRequestsToRequests: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    sourceCollection: string;
    targetCollection: string;
    scanned: number;
    migrated: number;
    migratedWithLegacyAnalyses: number;
}>, unknown>;
