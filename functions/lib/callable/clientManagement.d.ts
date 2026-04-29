import type { BackfillClientsFromRequestsResponse, CreateClientResponse, DeleteClientResponse, SaveClientChangesResponse } from '../types/clients.js';
export declare const createClient: import("firebase-functions/v2/https").CallableFunction<any, Promise<CreateClientResponse>, unknown>;
export declare const saveClientChanges: import("firebase-functions/v2/https").CallableFunction<any, Promise<SaveClientChangesResponse>, unknown>;
export declare const deleteClient: import("firebase-functions/v2/https").CallableFunction<any, Promise<DeleteClientResponse>, unknown>;
export declare const backfillClientsFromRequests: import("firebase-functions/v2/https").CallableFunction<any, Promise<BackfillClientsFromRequestsResponse>, unknown>;
