import { apiDelete, apiGet, apiPatch, apiPost } from './apiClient';
import type { AuthUser, PaginatedResult } from '../types/api';

export async function listUsers(page = 1, limit = 20): Promise<PaginatedResult<AuthUser>> {
  return apiGet<PaginatedResult<AuthUser>>('/users', { page, limit });
}

export async function getUser(id: number): Promise<AuthUser> {
  return apiGet<AuthUser>(`/users/${id}`);
}

export async function createUser(payload: Record<string, unknown>): Promise<AuthUser> {
  return apiPost<AuthUser>('/users', payload);
}

export async function updateUser(id: number, payload: Record<string, unknown>): Promise<AuthUser> {
  return apiPatch<AuthUser>(`/users/${id}`, payload);
}

export async function deleteUser(id: number): Promise<void> {
  await apiDelete(`/users/${id}`);
}
