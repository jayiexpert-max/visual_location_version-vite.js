import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PdservicePuidData {
  ReceiveDate?: string;
  PUID?: string;
  IM?: string;
  Customer?: string;
  HanaPart?: string;
  Description?: string;
  MnfPartNo?: string;
  LotNo?: string;
  DateCode?: string;
  BinSize?: string;
  Qty?: number;
  QtyRemain?: number;
  McID?: string | number;
  MachineName?: string;
  StatusName?: string;
  ExpirationDate?: string;
  OldIM?: string;
  Remark?: string;
  Loc_Shelf?: string;
  Loc_Level?: string | number;
  Loc_Box?: string;
  ExpireDate_RoomTemp?: string;
  [key: string]: unknown;
}

export interface PdserviceFetchResult {
  ok: boolean;
  httpCode: number;
  data: PdservicePuidData | null;
  error: string | null;
}

@Injectable()
export class PdserviceClient {
  private readonly logger = new Logger(PdserviceClient.name);

  constructor(private readonly configService: ConfigService) {}

  buildPuidUrl(puid: string): string {
    const base = this.configService
      .getOrThrow<string>('pdservice.baseUrl')
      .replace(/\/+$/, '');
    return `${base}/get_puidinfo/${encodeURIComponent(puid)}`;
  }

  async fetchPuid(puid: string): Promise<PdserviceFetchResult> {
    const url = this.buildPuidUrl(puid);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      const raw = await response.text();
      const httpCode = response.status;

      if (!response.ok) {
        return {
          ok: false,
          httpCode,
          data: null,
          error: `PDService returned HTTP ${httpCode}`,
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return {
          ok: false,
          httpCode,
          data: null,
          error: 'Invalid JSON response from PDService',
        };
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
          ok: false,
          httpCode,
          data: null,
          error: 'PDService returned unexpected payload',
        };
      }

      return {
        ok: true,
        httpCode,
        data: parsed as PdservicePuidData,
        error: null,
      };
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'PDService request timed out'
          : error instanceof Error
            ? error.message
            : 'PDService request failed';

      this.logger.warn(`PDService fetch failed for ${puid}: ${message}`);

      return {
        ok: false,
        httpCode: 0,
        data: null,
        error: message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
