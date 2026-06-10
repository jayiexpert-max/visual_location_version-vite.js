import { apiPost } from './apiClient';

export async function ioHighlight(payload: { boxId: number; slotNo?: number }): Promise<unknown> {
  return apiPost('/io/highlight', payload);
}

export async function ioOff(payload: { boxId: number }): Promise<unknown> {
  return apiPost('/io/off', payload);
}

export async function ioReset(): Promise<unknown> {
  return apiPost('/io/reset', {});
}
