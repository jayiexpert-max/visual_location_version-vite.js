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

export async function getPicklistDetail(payload: {
  picklistId: string;
  requiredOnly?: boolean;
}): Promise<unknown> {
  return apiPost('/cpk/picklists/detail', payload);
}

export async function issuePuidToPicklist(payload: {
  picklistId: string;
  puid: string;
  operator: string;
}): Promise<unknown> {
  return apiPost('/cpk/picklists/issue', payload);
}

export async function closePicklist(payload: {
  picklistId: string;
  operator: string;
  kitsNote?: string;
}): Promise<unknown> {
  return apiPost('/cpk/picklists/close', payload);
}

export async function stationInventoryCheck(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/cpk/station/inventory', payload);
}

export interface BookingEligibility {
  eligible: boolean;
  destination: string;
  blockers: string[];
  blockers_th: string[];
}

export interface BookingOutPreview {
  PUID: string;
  HanaPart: string;
  Description: string;
  IM: string;
  LotNo: string;
  Qty: number;
  QtyRemain: number;
  McID: string;
  MachineName: string;
  StatusName: string;
  ExpirationDate: string;
  Location: string;
  cpk_effective_remain: number | null;
  preview_sources: string[];
  booking_eligibility: Record<'STORE' | 'OTHER', BookingEligibility>;
}

export async function getBookingOutPreview(puid: string): Promise<BookingOutPreview> {
  return apiGet('/cpk/booking-out/preview', { puid: puid.trim().toUpperCase().replace(/^VL/i, '') });
}

export async function bookingOutPuid(payload: {
  puid: string;
  operator: string;
  destination: 'STORE' | 'OTHER';
}): Promise<unknown> {
  return apiPost('/cpk/booking-out', payload);
}

export async function clearCpkCache(): Promise<unknown> {
  return apiPost('/cpk/cache/clear', {});
}
