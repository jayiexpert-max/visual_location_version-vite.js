import { apiGet } from './apiClient';

export interface HealthSnapshot {
  status: string;
  timestamp: string;
  database?: { status: string; latencyMs?: number };
  nestjs?: { status: string; uptimeSec?: number };
  mqtt?: { connected: boolean; brokerUrl?: string };
  raspi?: { onlineDevices?: number; totalDevices?: number; status?: string };
  io?: { status?: string; deviceCount?: number };
  cpk?: { status: string; latencyMs?: number; message?: string };
  pdservice?: { status: string; latencyMs?: number; message?: string };
  socketio?: { status: string; activeConnections?: number };
  system?: {
    memory?: { usedBytes?: number; totalBytes?: number; usedPercent?: number };
    cpu?: { loadAverage1m?: number; cores?: number };
    uptimeSec?: number;
  };
}

export async function getHealth(): Promise<{ status: string; timestamp: string }> {
  return apiGet('/health');
}

export async function getHealthDashboard(): Promise<HealthSnapshot> {
  return apiGet('/health/dashboard');
}

export async function getDatabaseHealth(): Promise<{ status: string }> {
  return apiGet('/health/database');
}

export async function getMqttHealth(): Promise<{ connected: boolean }> {
  return apiGet('/health/mqtt');
}

export async function getRaspiHealth(): Promise<Record<string, unknown>> {
  return apiGet('/health/raspi');
}

export async function getIoHealth(): Promise<Record<string, unknown>> {
  return apiGet('/health/io');
}

export async function getSocketIoHealth(): Promise<{ status: string; activeConnections: number }> {
  return apiGet('/health/socketio');
}

export async function getSystemMetrics(): Promise<Record<string, unknown>> {
  return apiGet('/health/system');
}

export interface CpkHealthResult {
  status: string;
  latencyMs?: number;
  message?: string;
  code?: string;
  data?: unknown;
}

export async function getCpkHealth(): Promise<CpkHealthResult> {
  return apiGet('/health/cpk');
}

export interface CpkEndpointLatency {
  name: string;
  method: 'GET' | 'POST';
  url: string;
  status: 'reachable' | 'error';
  latencyMs: number;
  httpCode: number;
  cpkStatus?: string | null;
  message?: string | null;
}

export interface CpkEndpointHealthResult {
  status: string;
  timestamp: string;
  baseUrl: string;
  endpoints: CpkEndpointLatency[];
}

export async function getCpkEndpointHealth(): Promise<CpkEndpointHealthResult> {
  return apiGet('/health/cpk/endpoints');
}

export async function getPdserviceHealth(): Promise<{ status: string }> {
  return apiGet('/health/pdservice');
}
