import axios from 'axios';
import type { ApiSuccessResponse } from '../types/api';
import { apiDelete, apiGet, apiPatch, apiPost } from './apiClient';
import type { BoxLayout, EthernetIoDevice, WarehouseHierarchy } from '../types/warehouse';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

function tvKioskHeaders(tvKey?: string): Record<string, string> | undefined {
  if (!tvKey) return undefined;
  return { 'X-TV-Kiosk-Key': tvKey };
}

export async function getHierarchy(tvKey?: string): Promise<WarehouseHierarchy> {
  const headers = tvKioskHeaders(tvKey);
  const { data } = await axios.get<ApiSuccessResponse<WarehouseHierarchy>>(
    `${API_BASE}/warehouse/hierarchy`,
    headers ? { headers } : undefined,
  );
  return data.data;
}

export async function getRack(id: number): Promise<unknown> {
  return apiGet(`/warehouse/racks/${id}`);
}

export async function getBoxLayout(
  boxId: number,
  highlightSlotId?: number,
  tvKey?: string,
): Promise<BoxLayout> {
  const params =
    highlightSlotId != null ? { highlightSlotId } : undefined;
  const headers = tvKioskHeaders(tvKey);
  if (headers) {
    const { data } = await axios.get<ApiSuccessResponse<BoxLayout>>(
      `${API_BASE}/warehouse/boxes/${boxId}/layout`,
      { headers, params },
    );
    return data.data;
  }
  return apiGet<BoxLayout>(`/warehouse/boxes/${boxId}/layout`, params);
}

export async function getBoxProducts(boxId: number): Promise<unknown> {
  return apiGet(`/warehouse/boxes/${boxId}/products`);
}

export async function listIoDevices(): Promise<EthernetIoDevice[]> {
  return apiGet<EthernetIoDevice[]>('/io/devices');
}

export async function createIoDevice(payload: Partial<EthernetIoDevice>): Promise<EthernetIoDevice> {
  return apiPost<EthernetIoDevice>('/io/devices', payload);
}

export async function updateIoDevice(id: number, payload: Partial<EthernetIoDevice>): Promise<EthernetIoDevice> {
  return apiPatch<EthernetIoDevice>(`/io/devices/${id}`, payload);
}

export async function deleteIoDevice(id: number): Promise<void> {
  await apiDelete(`/io/devices/${id}`);
}

export async function adminListRacks(): Promise<unknown[]> {
  return apiGet('/warehouse/admin/racks');
}

export async function adminCreateRack(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/warehouse/admin/racks', payload);
}

export async function adminUpdateRack(id: number, payload: Record<string, unknown>): Promise<unknown> {
  return apiPatch(`/warehouse/admin/racks/${id}`, payload);
}

export async function adminDeleteRack(id: number): Promise<void> {
  await apiDelete(`/warehouse/admin/racks/${id}`);
}

export async function adminListLevels(): Promise<unknown[]> {
  return apiGet('/warehouse/admin/levels');
}

export async function adminCreateLevel(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/warehouse/admin/levels', payload);
}

export async function adminUpdateLevel(id: number, payload: Record<string, unknown>): Promise<unknown> {
  return apiPatch(`/warehouse/admin/levels/${id}`, payload);
}

export async function adminDeleteLevel(id: number): Promise<void> {
  await apiDelete(`/warehouse/admin/levels/${id}`);
}

export async function adminListBoxes(): Promise<unknown[]> {
  return apiGet('/warehouse/admin/boxes');
}

export async function adminCreateBox(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/warehouse/admin/boxes', payload);
}

export async function adminUpdateBox(id: number, payload: Record<string, unknown>): Promise<unknown> {
  return apiPatch(`/warehouse/admin/boxes/${id}`, payload);
}

export async function adminDeleteBox(id: number): Promise<void> {
  await apiDelete(`/warehouse/admin/boxes/${id}`);
}

export async function adminListSlots(): Promise<unknown[]> {
  return apiGet('/warehouse/admin/slots');
}

export async function adminCreateSlot(payload: Record<string, unknown>): Promise<unknown> {
  return apiPost('/warehouse/admin/slots', payload);
}

export async function adminUpdateSlot(id: number, payload: Record<string, unknown>): Promise<unknown> {
  return apiPatch(`/warehouse/admin/slots/${id}`, payload);
}

export async function adminDeleteSlot(id: number): Promise<void> {
  await apiDelete(`/warehouse/admin/slots/${id}`);
}

export async function adminListProducts(boxId?: number): Promise<import('../types/adminProducts').ProductAdminRow[]> {
  return apiGet('/warehouse/admin/products', boxId ? { boxId } : undefined);
}

export async function adminCreateProduct(payload: {
  slotId: number;
  name?: string;
  qty?: number;
  remark?: string;
}): Promise<unknown> {
  return apiPost('/warehouse/admin/products', payload);
}

export async function adminUpdateProduct(
  id: number,
  payload: { slotId?: number; name?: string; qty?: number; remark?: string },
): Promise<unknown> {
  return apiPatch(`/warehouse/admin/products/${id}`, payload);
}

export async function adminDeleteProduct(id: number): Promise<void> {
  await apiDelete(`/warehouse/admin/products/${id}`);
}

export async function adminListProductBoxOptions(): Promise<
  import('../types/adminProducts').ProductBoxOption[]
> {
  return apiGet('/warehouse/admin/products/box-options');
}

export async function adminListEmptyProductSlots(
  boxId?: number,
  currentSlotId?: number,
): Promise<import('../types/adminProducts').ProductSlotOption[]> {
  const params: Record<string, number> = {};
  if (boxId) params.boxId = boxId;
  if (currentSlotId) params.currentSlotId = currentSlotId;
  return apiGet('/warehouse/admin/products/empty-slots', Object.keys(params).length ? params : undefined);
}

export async function adminGetNextEmptyProductSlot(
  boxId?: number,
): Promise<{ slotId: number | null }> {
  return apiGet('/warehouse/admin/products/next-empty-slot', boxId ? { boxId } : undefined);
}

export async function adminGetFifoSettings(): Promise<import('../types/adminProducts').FifoSettings> {
  return apiGet('/warehouse/admin/fifo-settings');
}

export async function adminUpdateFifoSettings(payload: {
  fifoIssueMode: string;
  fifoDummyIm: string;
  confirmPassword: string;
}): Promise<import('../types/adminProducts').FifoSettings> {
  return apiPatch('/warehouse/admin/fifo-settings', payload);
}
