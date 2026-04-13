interface RejectProformaResponse {
    requestId: string;
    approvalStatus: 'rejected';
}
export declare const rejectProforma: import("firebase-functions/v2/https").CallableFunction<any, Promise<RejectProformaResponse>, unknown>;
export {};
