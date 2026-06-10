import { apiGet } from './apiClient';

export async function getHealth(): Promise<{ status: string; timestamp: string }> {
  return apiGet('/health');
}

export async function getCpkHealth(): Promise<{ status: string; version?: string }> {
  return apiGet('/health/cpk');
}

export async function getPdserviceHealth(): Promise<{ status: string }> {
  return apiGet('/health/pdservice');
}
