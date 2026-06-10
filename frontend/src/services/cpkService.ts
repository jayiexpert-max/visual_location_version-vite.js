import { apiGet, apiPost } from './apiClient';

export async function getCpkVersion(): Promise<unknown> {
  return apiGet('/cpk/version');
}

export async function getReservationInfo(keyword: string): Promise<unknown> {
  return apiGet(`/cpk/reservations/${encodeURIComponent(keyword)}`);
}

export async function receiveReservation(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/cpk/reservations/receive', payload);
}

export async function returnPuid(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/cpk/puid/return', payload);
}

export async function getOpenPicklists(payload?: Record<string, unknown>): Promise<unknown> {
  return apiPost('/cpk/picklists/open', payload ?? {});
}

export async function getPicklistDetail(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/cpk/picklists/detail', payload);
}

export async function issuePuidToPicklist(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/cpk/picklists/issue', payload);
}

export async function closePicklist(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/cpk/picklists/close', payload);
}

export async function stationInventoryCheck(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/cpk/station/inventory', payload);
}

export async function clearCpkCache(): Promise<unknown> {
  return apiPost('/cpk/cache/clear', {});
}
