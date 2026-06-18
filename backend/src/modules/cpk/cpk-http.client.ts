import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CpkHttpResult,
  CpkLogicalEndpoint,
  CpkResponseBody,
  CpkStatus,
} from './interfaces/cpk.types';

const CPK_PATHS: Record<CpkLogicalEndpoint, string> = {
  GetVersion: 'GetVersion',
  GET_RESNoInfo: 'GET_RESNoInfo',
  GetPublicUID: 'GetPublicUID/',
  RES_PUIDRecv: 'RES_PUIDRecv/',
  IssuePUIDToPicklist: 'IssuePUIDToPicklist/',
  UpdatePUIDStatus: 'UpdatePUIDStatus/',
  GetOpenPicklists: 'GetOpenPicklists/',
  GetPicklistDetail: 'GetPicklistDetail/',
  ClosePicklist: 'ClosePicklist/',
  StationInvenCheck: 'StationInvenCheck/',
  BookingOutPUID: 'BookingOutPUID/',
  GET_WOBOMInfo: 'GET_WOBOMInfo',
  ClearCache: 'ClearCache/',
};

@Injectable()
export class CpkHttpClient {
  private readonly logger = new Logger(CpkHttpClient.name);

  constructor(private readonly configService: ConfigService) {}

  async get(
    logical: CpkLogicalEndpoint,
    pathParam?: string,
  ): Promise<CpkHttpResult> {
    return this.request('GET', logical, undefined, pathParam);
  }

  async post(
    logical: CpkLogicalEndpoint,
    body: Record<string, unknown> = {},
  ): Promise<CpkHttpResult> {
    return this.request('POST', logical, body);
  }

  private getBaseUrl(): string {
    const useLegacy = this.configService.get<boolean>('cpk.useLegacyUrl', false);
    const key = useLegacy ? 'cpk.legacyUrl' : 'cpk.baseUrl';
    return this.configService.getOrThrow<string>(key).replace(/\/+$/, '');
  }

  private buildUrl(logical: CpkLogicalEndpoint, pathParam?: string): string {
    let segment = CPK_PATHS[logical] ?? logical;
    if (pathParam !== undefined && pathParam !== '') {
      segment = `${segment.replace(/\/+$/, '')}/${encodeURIComponent(pathParam)}`;
    }
    return `${this.getBaseUrl()}/${segment.replace(/^\/+/, '')}`;
  }

  private async request(
    method: 'GET' | 'POST',
    logical: CpkLogicalEndpoint,
    body?: Record<string, unknown>,
    pathParam?: string,
  ): Promise<CpkHttpResult> {
    const url = this.buildUrl(logical, pathParam);
    const timeoutMs =
      this.configService.get<number>('cpk.curlTimeout', 10) * 1000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
      }

      const response = await fetch(url, init);
      const raw = await response.text();
      const httpCode = response.status;

      let decoded: CpkResponseBody | null = null;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          decoded = parsed as CpkResponseBody;
        }
      } catch {
        decoded = null;
      }

      const cpkStatus = decoded?.Status ?? null;
      const cpkMessage =
        typeof decoded?.Message === 'string' ? decoded.Message : null;

      let ok = httpCode >= 200 && httpCode < 300;
      if (decoded?.Status !== undefined) {
        ok = ok && decoded.Status === 'S';
      }

      return {
        ok,
        httpCode,
        data: decoded ?? raw,
        raw,
        error: ok ? null : cpkMessage ?? `HTTP ${httpCode}`,
        cpkStatus,
        cpkMessage,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'CPK request failed';
      this.logger.warn(`CPK ${method} ${logical} failed: ${message}`);

      const isAbort =
        error instanceof Error && error.name === 'AbortError';

      return {
        ok: false,
        httpCode: 0,
        data: {
          Status: 'E' as CpkStatus,
          Message: isAbort ? 'CPK request timed out' : message,
        },
        raw: '',
        error: isAbort ? 'CPK request timed out' : message,
        cpkStatus: 'E',
        cpkMessage: isAbort ? 'CPK request timed out' : message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
