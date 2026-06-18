import { apiClient, apiDelete, apiGet, apiPatch, apiPost } from './apiClient';
import type { ApiSuccessResponse, PaginatedResult } from '../types/api';

export interface MaterialRow {
  id: number;
  materialCode: string;
  description: string | null;
  remark: string | null;
}

export interface MaterialImportResult {
  added: number;
  updated: number;
  total: number;
}

export async function listMaterials(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResult<MaterialRow>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  return apiGet(`/materials?${qs.toString()}`);
}

export async function createMaterial(payload: {
  materialCode: string;
  description?: string;
  remark?: string;
}): Promise<MaterialRow> {
  return apiPost('/materials', payload);
}

export async function updateMaterial(
  id: number,
  payload: { materialCode?: string; description?: string; remark?: string },
): Promise<MaterialRow> {
  return apiPatch(`/materials/${id}`, payload);
}

export async function deleteMaterial(id: number): Promise<void> {
  await apiDelete(`/materials/${id}`);
}

export async function exportMaterialsCsv(search?: string, lang?: string): Promise<void> {
  const params: Record<string, string> = {};
  if (search?.trim()) params.search = search.trim();
  if (lang) params.lang = lang;

  const response = await apiClient.get('/materials/export', {
    params,
    responseType: 'blob',
  });

  const blob = response.data as Blob;
  const disposition = response.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `materials_${new Date().toISOString().slice(0, 10)}.csv`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importMaterialsCsv(file: File): Promise<MaterialImportResult> {
  const form = new FormData();
  form.append('file', file);

  const { data } = await apiClient.post<ApiSuccessResponse<MaterialImportResult>>(
    '/materials/import',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  return data.data;
}
