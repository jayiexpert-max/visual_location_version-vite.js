import { apiGet } from './apiClient';
import type { PaginatedResult } from '../types/api';

export async function getStockMovements(params: Record<string, unknown>): Promise<PaginatedResult<unknown>> {
  return apiGet<PaginatedResult<unknown>>('/reports/stock-movements', params);
}

export async function getExpirationReport(params: Record<string, unknown>): Promise<PaginatedResult<unknown>> {
  return apiGet<PaginatedResult<unknown>>('/reports/expiration', params);
}

export async function getInventoryReceiveReport(params: Record<string, unknown>): Promise<PaginatedResult<unknown>> {
  return apiGet<PaginatedResult<unknown>>('/reports/inventory-receive', params);
}
