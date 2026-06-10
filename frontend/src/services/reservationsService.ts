import { apiGet } from './apiClient';

export async function listReservations(): Promise<unknown[]> {
  return apiGet('/reservations');
}

export async function getReservation(resNo: string): Promise<unknown> {
  return apiGet(`/reservations/${encodeURIComponent(resNo)}`);
}
