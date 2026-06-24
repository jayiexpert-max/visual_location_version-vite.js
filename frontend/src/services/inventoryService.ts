import axios from 'axios';
import { apiGet, apiPatch, apiPost } from './apiClient';
import type { InventoryReceive, InventorySearchResult } from '../types/inventory';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

function tvKioskHeaders(tvKey?: string): Record<string, string> | undefined {
  if (!tvKey) return undefined;
  return { 'X-TV-Kiosk-Key': tvKey };
}

export interface SearchResolveData {
  id: number;
  qty: number;
  puidCount: number;
  hanaPart: string;
  puid: string;
  searchTerm: string;
  searchMode: 'hanapart' | 'puid';
  slotId: number;
  slotNo: number;
  boxId: number;
  boxCode: string;
  layout: string;
  levelNo: number | string;
  rackName: string;
}

export interface SearchResolveResponse {
  status: 'success' | 'error';
  message?: string;
  data?: SearchResolveData;
}

export async function searchResolve(q: string, tvKey?: string): Promise<SearchResolveResponse> {
  const headers = tvKioskHeaders(tvKey);
  if (headers) {
    const { data } = await axios.get<SearchResolveResponse>(
      `${API_BASE}/inventory/search-resolve`,
      { headers, params: { q } },
    );
    return data;
  }
  return apiGet('/inventory/search-resolve', { q });
}

export interface InventoryLookupData {
  PUID: string;
  HanaPart: string;
  IM?: string;
  Customer?: string;
  Description?: string;
  LotNo?: string;
  QtyRemain: number;
  Qty: number;
  ExpirationDate?: string;
  Loc_Shelf?: string;
  Loc_Level?: string | number;
  Loc_Box?: string;
  Loc_Slot?: number;
  slot_id?: number;
  box_id?: number;
  StatusName?: string;
  ReceiveDate?: string;
}

export interface AddStockPayload {
  puid: string;
  im: string;
  hanaPart: string;
  slotId: number;
  qty: number;
  qtyRemain: number;
  receiveDate?: string;
  customer?: string;
  description?: string;
  lotNo?: string;
  expirationDate?: string;
  statusName?: string;
  locShelf?: string;
  locLevel?: string;
  locBox?: string;
  locSlot?: number;
  reservationNo?: string;
}

export async function receiveReturn(payload: AddStockPayload): Promise<unknown> {
  return apiPost('/inventory/receive-return', payload);
}

export interface HighlightLocationResponse {
  location: {
    rackId: number;
    rackName: string;
    levelNo: number;
    boxId: number;
    boxCode: string;
    slotId: number;
    slotNo: number;
  };
  tv: {
    highlightSeq: string;
    productName: string;
    puid?: string | null;
    boxId: number;
    slotId: number;
    slotNo: number;
    rackName: string;
    levelNo: number;
    boxCode: string;
    qty: number;
    expiresAt: string;
  };
  io?: { deviceId: number; outputPin: number; status: string } | null;
}

export async function highlightLocation(payload: {
  query: string;
  slotId?: number;
}): Promise<HighlightLocationResponse> {
  return apiPost<HighlightLocationResponse>('/inventory/highlight', payload);
}

export interface InventoryLookupResponse {
  status: 'success' | 'error';
  message?: string;
  data?: InventoryLookupData;
  pdserviceOffline?: boolean;
  pdserviceWarning?: string;
}

export async function lookupPuid(puid: string, hanaPart?: string): Promise<InventoryLookupResponse> {
  return apiGet('/inventory/lookup', {
    puid,
    ...(hanaPart ? { hanaPart } : {}),
  });
}

export async function searchInventory(q: string): Promise<InventorySearchResult> {
  return apiGet<InventorySearchResult>('/inventory/search', { q });
}

export async function getPuid(puid: string): Promise<InventoryReceive> {
  return apiGet<InventoryReceive>(`/inventory/puid/${encodeURIComponent(puid)}`);
}

export async function receiveItem(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/inventory/receive', payload);
}

export interface ExpirationSyncResult {
  status: 'success' | 'skipped' | 'error';
  message: string;
  updated: number;
  matched: number;
  total: number;
  resNo?: string;
  syncScope?: string;
  pdservice?: {
    status: string;
    message: string;
    checked: number;
    updated: number;
    errors: number;
  };
}

export interface ResSyncListItem {
  resNo: string;
  puidCount: number;
  lastUpdated: string | null;
}

export async function syncExpiration(payload: {
  search?: string;
  resNo?: string;
}): Promise<ExpirationSyncResult> {
  return apiPost('/inventory/expiration/sync', payload);
}

export async function listExpirationResOptions(): Promise<string[]> {
  return apiGet('/inventory/expiration/res-options');
}

export async function listExpirationResSyncList(params: {
  search?: string;
  status?: string;
  resNo?: string;
}): Promise<ResSyncListItem[]> {
  return apiGet('/inventory/expiration/res-sync-list', params);
}

export async function refreshPuidExpiration(
  puid: string,
  id?: number,
): Promise<{ message: string; oldDate: string | null; newDate: string | null }> {
  return apiPatch(`/inventory/${encodeURIComponent(puid)}/expiration`, id ? { id } : {});
}
