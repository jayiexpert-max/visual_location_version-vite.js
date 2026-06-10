import { apiGet, apiPost } from './apiClient';
import type { InventoryReceive, InventorySearchResult } from '../types/inventory';

export async function searchInventory(q: string): Promise<InventorySearchResult> {
  return apiGet<InventorySearchResult>('/inventory/search', { q });
}

export async function getPuid(puid: string): Promise<InventoryReceive> {
  return apiGet<InventoryReceive>(`/inventory/puid/${encodeURIComponent(puid)}`);
}

export async function receiveItem(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/inventory/receive', payload);
}

export async function receiveReturn(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/inventory/receive-return', payload);
}

export async function highlightLocation(payload: {
  productName?: string;
  boxId: number;
  slotId?: number;
  slotNo?: number;
  rackName?: string;
  levelNo?: number;
  boxCode?: string;
  qty?: number;
}): Promise<unknown> {
  return apiPost('/inventory/highlight', payload);
}
