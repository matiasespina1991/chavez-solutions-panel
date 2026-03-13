interface ApproveServiceRequestResponse {
    sourceRequestId: string;
    approvalStatus: 'approved';
    alreadyApproved: boolean;
}
export declare const approveServiceRequest: import("firebase-functions/v2/https").CallableFunction<any, Promise<ApproveServiceRequestResponse>, unknown>;
export {};
