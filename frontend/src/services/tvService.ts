import axios from 'axios';
import type { ApiSuccessResponse } from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export interface TvHighlight {
  id: number;
  productName: string | null;
  boxId: number;
  slotId: number | null;
  slotNo: number | null;
  rackName: string | null;
  levelNo: number | null;
  boxCode: string | null;
  qty: number;
  searchedBy: string | null;
  highlightSeq: string;
  actionType: string;
  expiresAt: string;
  createdAt: string;
}

export async function getTvHighlight(tvKey?: string): Promise<TvHighlight | null> {
  const headers: Record<string, string> = {};
  if (tvKey) headers['X-TV-Kiosk-Key'] = tvKey;
  const { data } = await axios.get<ApiSuccessResponse<TvHighlight | null>>(
    `${API_BASE}/tv/highlight`,
    { headers },
  );
  return data.data;
}

export async function setTvHighlight(payload: Record<string, unknown>): Promise<TvHighlight> {
  const { apiPost } = await import('./apiClient');
  return apiPost<TvHighlight>('/tv/highlight', payload);
}

export async function clearTvHighlight(): Promise<void> {
  const { apiDelete } = await import('./apiClient');
  await apiDelete('/tv/highlight');
}
