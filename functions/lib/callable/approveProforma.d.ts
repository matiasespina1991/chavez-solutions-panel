interface ApproveProformaResponse {
    requestId: string;
    approvalStatus: 'approved';
    alreadyApproved: boolean;
}
export declare const approveProforma: import("firebase-functions/v2/https").CallableFunction<any, Promise<ApproveProformaResponse>, unknown>;
export {};
