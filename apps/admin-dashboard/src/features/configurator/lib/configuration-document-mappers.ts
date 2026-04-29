import type {
  ConfigurationDocument,
  ConfigurationServiceGroup,
  ConfigurationServiceItem,
  RequestDocument
} from '@/features/configurator/lib/configuration-contracts';

const normalizeStoredServices = (
  services: RequestDocument['services']
): ConfigurationDocument['services'] => {
  if (
    typeof services === 'object' &&
    services !== null &&
    !Array.isArray(services)
  ) {
    return {
      items: Array.isArray(
        (services as { items?: ConfigurationServiceItem[] }).items
      )
        ? (services as { items?: ConfigurationServiceItem[] }).items ?? []
        : [],
      grouped: Array.isArray(
        (services as { grouped?: ConfigurationServiceGroup[] }).grouped
      )
        ? (services as { grouped?: ConfigurationServiceGroup[] }).grouped ?? []
        : []
    };
  }

  return {
    items: Array.isArray(services) ? services : [],
    grouped: []
  };
};

export const mapRequestDocumentToConfiguration = (
  id: string,
  request: RequestDocument,
  status: ConfigurationDocument['status']
): ConfigurationDocument => ({
  ...request,
  id,
  status,
  requestStatus: request.status,
  approvalStatus: request.approval?.status,
  services: normalizeStoredServices(request.services)
});
