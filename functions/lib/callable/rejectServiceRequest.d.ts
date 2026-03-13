interface RejectServiceRequestResponse {
    sourceRequestId: string;
    approvalStatus: 'rejected';
}
export declare const rejectServiceRequest: import("firebase-functions/v2/https").CallableFunction<any, Promise<RejectServiceRequestResponse>, unknown>;
export {};
