export declare const listServiceHistory: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    entries: {
        id: string;
        createdAt: any;
        fileName: any;
        serviceCount: any;
        isCurrent: boolean;
    }[];
    currentHistoryId: any;
}>, unknown>;
