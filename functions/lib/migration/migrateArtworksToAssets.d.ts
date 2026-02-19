import * as functions from 'firebase-functions';
export declare const migrateArtworksToAssets: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    migrated: number;
}>, unknown>;
