import { apiGet } from './apiClient';

export interface MqttLogEntry {
  id: string;
  direction: 'inbound' | 'outbound';
  topic: string;
  payloadJson: Record<string, unknown>;
  deviceId: number | null;
  status: string;
  createdAt: string;
}

export interface RaspberryDevice {
  id: number;
  deviceId: number;
  name?: string;
  ipAddress: string | null;
  port?: number;
  status: 'online' | 'offline' | 'unknown';
  lastHeartbeatAt: string | null;
  outputCount: number;
  message?: string;
  healthUrl?: string;
  controllerType?: string;
}

export async function getIoStatus(): Promise<unknown> {
  return apiGet('/io/status');
}

export async function getMqttLogs(limit = 100): Promise<MqttLogEntry[]> {
  return apiGet<MqttLogEntry[]>(`/io/monitor/mqtt-logs?limit=${limit}`);
}

export async function getRaspberryDevices(): Promise<RaspberryDevice[]> {
  return apiGet<RaspberryDevice[]>('/io/monitor/raspberry-devices');
}

export async function getRealtimeEvents(limit = 50): Promise<unknown[]> {
  return apiGet<unknown[]>(`/io/monitor/realtime-events?limit=${limit}`);
}

export async function getMonitorHealth(): Promise<unknown> {
  return apiGet('/io/monitor/health');
}

export async function getHealthMqtt(): Promise<unknown> {
  return apiGet('/health/mqtt');
}

export async function getHealthRaspi(): Promise<unknown> {
  return apiGet('/health/raspi');
}

export async function getHealthIo(): Promise<unknown> {
  return apiGet('/health/io');
}
