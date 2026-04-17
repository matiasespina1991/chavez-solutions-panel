export type TechnicalServicePatchValue = string | number | null;

export interface CreateTechnicalServiceRequest {
  payload?: Record<string, unknown>;
}

export interface CreateTechnicalServiceResponse {
  id: string;
}

export interface DeleteTechnicalServiceRequest {
  id?: string;
}

export interface DeleteTechnicalServiceResponse {
  deletedId: string;
}

export interface TechnicalServiceChange {
  id?: string;
  patch?: Record<string, unknown>;
  lastKnownUpdatedAt?: string | null;
}

export interface SaveServicesTechnicalChangesRequest {
  changes?: TechnicalServiceChange[];
  reason?: string;
}

export interface SaveServicesTechnicalChangesResponse {
  updated: number;
  skipped: number;
  notFound: string[];
  conflicts: string[];
  invalid: string[];
  auditId: string;
}
