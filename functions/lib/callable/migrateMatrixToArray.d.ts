interface CollectionMigrationStats {
    updated: number;
    alreadyArray: number;
    invalidToEmpty: number;
    errors: number;
}
interface MigrationResponse {
    service_requests: CollectionMigrationStats;
    work_orders: CollectionMigrationStats;
}
export declare const migrateMatrixToArray: import("firebase-functions/v2/https").CallableFunction<any, Promise<MigrationResponse>, unknown>;
export {};
