import type { SupportedLanguage } from '@visual-location/shared';
import { apiGet, apiPatch, apiPost } from './apiClient';
import type { AuthUser, LoginResponse } from '../types/api';

export async function login(
  username: string,
  password: string,
  deviceType: 'desktop' | 'handheld' | 'tv' = 'desktop',
): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/auth/login', { username, password, deviceType });
}

export async function logout(): Promise<void> {
  await apiPost('/auth/logout');
}

export async function getMe(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me');
}

export async function updateMe(payload: { lang?: SupportedLanguage }): Promise<AuthUser> {
  return apiPatch<AuthUser>('/auth/me', payload);
}
