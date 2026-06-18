import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ProbeMethod = 'GET' | 'POST';

interface CpkEndpointProbe {
  name: string;
  method: ProbeMethod;
  path: string;
  pathParam?: string;
}

export interface CpkEndpointLatency {
  name: string;
  method: ProbeMethod;
  url: string;
  status: 'reachable' | 'error';
  latencyMs: number;
  httpCode: number;
  cpkStatus?: string | null;
  message?: string | null;
}

const CPK_ENDPOINT_PROBES: CpkEndpointProbe[] = [
  { name: 'BookingOutPUID', method: 'POST', path: 'BookingOutPUID/' },
  { name: 'ClearCache', method: 'POST', path: 'ClearCache/' },
  { name: 'ClosePicklist', method: 'POST', path: 'ClosePicklist/' },
  { name: 'GET_PUIDInfo', method: 'GET', path: 'GET_PUIDInfo', pathParam: 'CHK_PUID' },
  { name: 'GET_RESNoInfo', method: 'GET', path: 'GET_RESNoInfo', pathParam: 'CHK_KEYWORD' },
  { name: 'GET_WOBOMInfo', method: 'GET', path: 'GET_WOBOMInfo', pathParam: 'CHK_WO' },
  { name: 'GetOpenPicklists', method: 'POST', path: 'GetOpenPicklists/' },
  { name: 'GetPicklistDetail', method: 'POST', path: 'GetPicklistDetail/' },
  { name: 'GetPublicUID', method: 'POST', path: 'GetPublicUID/' },
  { name: 'GetVersion', method: 'GET', path: 'GetVersion' },
  { name: 'IssuePUIDToPicklist', method: 'POST', path: 'IssuePUIDToPicklist/' },
  { name: 'RES_PUIDRecv', method: 'POST', path: 'RES_PUIDRecv/' },
  { name: 'StationInvenCheck', method: 'POST', path: 'StationInvenCheck/' },
  { name: 'UpdatePUIDStatus', method: 'POST', path: 'UpdatePUIDStatus/' },
];

@Injectable()
export class CpkEndpointHealthService {
  constructor(private readonly configService: ConfigService) {}

  async checkAll(): Promise<{
    status: 'ok' | 'degraded';
    timestamp: string;
    baseUrl: string;
    endpoints: CpkEndpointLatency[];
  }> {
    const baseUrl = this.getBaseUrl();
    const endpoints = await Promise.all(
      CPK_ENDPOINT_PROBES.map((probe) => this.checkEndpoint(baseUrl, probe)),
    );
    const hasReachableEndpoint = endpoints.some((endpoint) => endpoint.status === 'reachable');

    return {
      status: hasReachableEndpoint ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      baseUrl,
      endpoints,
    };
  }

  private getBaseUrl(): string {
    return this.configService
      .getOrThrow<string>('cpk.legacyUrl')
      .replace(/\/+$/, '');
  }

  private buildUrl(baseUrl: string, probe: CpkEndpointProbe): string {
    let segment = probe.path.replace(/^\/+/, '');
    if (probe.pathParam) {
      segment = `${segment.replace(/\/+$/, '')}/${encodeURIComponent(probe.pathParam)}`;
    }
    return `${baseUrl}/${segment}`;
  }

  private async checkEndpoint(
    baseUrl: string,
    probe: CpkEndpointProbe,
  ): Promise<CpkEndpointLatency> {
    const url = this.buildUrl(baseUrl, probe);
    const timeoutMs = this.configService.get<number>('cpk.curlTimeout', 10) * 1000;
    const controller = new AbortController();
    const startedAt = Date.now();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const init: RequestInit = {
        method: probe.method,
        headers,
        signal: controller.signal,
      };

      if (probe.method === 'POST') {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify({});
      }

      const response = await fetch(url, init);
      const raw = await response.text();
      const parsed = this.parseResponse(raw);

      return {
        name: probe.name,
        method: probe.method,
        url,
        status: 'reachable',
        latencyMs: Date.now() - startedAt,
        httpCode: response.status,
        cpkStatus: parsed.status,
        message: parsed.message,
      };
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      return {
        name: probe.name,
        method: probe.method,
        url,
        status: 'error',
        latencyMs: Date.now() - startedAt,
        httpCode: 0,
        cpkStatus: null,
        message: isAbort
          ? 'CPK endpoint probe timed out'
          : error instanceof Error
            ? error.message
            : 'CPK endpoint probe failed',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResponse(raw: string): { status: string | null; message: string | null } {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { status: null, message: raw.slice(0, 200) || null };
      }
      const record = parsed as Record<string, unknown>;
      return {
        status: record.Status == null ? null : String(record.Status),
        message: record.Message == null ? null : String(record.Message),
      };
    } catch {
      return { status: null, message: raw.slice(0, 200) || null };
    }
  }
}
