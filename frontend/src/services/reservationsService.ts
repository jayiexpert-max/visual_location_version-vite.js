import { apiGet } from './apiClient';
import type { ResDetailResponse, ReservationListItem } from '../utils/reservationUtils';

export async function listReservations(): Promise<ReservationListItem[]> {
  return apiGet('/reservations');
}

export async function getReservation(resNo: string): Promise<ReservationListItem> {
  return apiGet(`/reservations/${encodeURIComponent(resNo)}`);
}

export async function getReservationDetail(resNo: string): Promise<ResDetailResponse> {
  return apiGet(`/reservations/${encodeURIComponent(resNo)}/detail`);
}
