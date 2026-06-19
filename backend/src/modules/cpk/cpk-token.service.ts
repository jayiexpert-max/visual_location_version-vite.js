import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CpkHttpClient } from './cpk-http.client';
import { CpkTokenRepository } from './cpk-token.repository';
import type { CpkResponseBody, PublicUidResult } from './interfaces/cpk.types';

@Injectable()
export class CpkTokenService {
  private readonly logger = new Logger(CpkTokenService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cpkHttpClient: CpkHttpClient,
    private readonly cpkTokenRepository: CpkTokenRepository,
  ) {}

  getMcId(): string | null {
    const mcId = this.configService.get<string>('cpk.mcId', '').trim();
    return mcId !== '' ? mcId : null;
  }

  getStationKey(): string | null {
    const key = this.configService.get<string>('cpk.stationKey', '').trim();
    return key !== '' ? key : null;
  }

  mcIdMissingMessage(): string {
    return 'CPK McID is not configured. Set CPK_MC_ID in .env (from IT) to use authenticated CPK POST endpoints.';
  }

  requireMcIdConfigured(): void {
    if (!this.getMcId()) {
      throw new ServiceUnavailableException({
        message: this.mcIdMissingMessage(),
        code: 'CPK_UNAVAILABLE',
      });
    }
    if (!this.getStationKey()) {
      throw new ServiceUnavailableException({
        message:
          'CPK StationKey is not configured. Set CPK_STATION_KEY in .env.',
        code: 'CPK_UNAVAILABLE',
      });
    }
  }

  async clearCache(): Promise<void> {
    await this.cpkTokenRepository.clear();
  }

  async isExpired(): Promise<boolean> {
    const cached = await this.cpkTokenRepository.findCached();
    return this.isExpiredRow(cached);
  }

  async getCachedPublicUid(): Promise<string | null> {
    const started = Date.now();
    const cached = await this.cpkTokenRepository.findCached();
    if (!cached?.publicUid) {
      this.logger.debug(`PublicUID cache miss (${Date.now() - started}ms)`);
      return null;
    }
    if (this.isExpiredRow(cached)) {
      this.logger.debug(`PublicUID cache expired (${Date.now() - started}ms)`);
      return null;
    }
    this.logger.debug(`PublicUID cache hit (${Date.now() - started}ms)`);
    return cached.publicUid;
  }

  async getPublicUid(forceRefresh = false): Promise<PublicUidResult> {
    const started = Date.now();
    if (!forceRefresh) {
      const cachedUid = await this.getCachedPublicUid();
      if (cachedUid) {
        this.logger.debug(`PublicUID reused from cache (${Date.now() - started}ms)`);
        return {
          ok: true,
          publicUid: cachedUid,
          message: 'OK',
          data: null,
        };
      }
    }

    const mcId = this.getMcId();
    const stationKey = this.getStationKey();

    if (!mcId) {
      return {
        ok: false,
        publicUid: null,
        message: this.mcIdMissingMessage(),
        data: null,
      };
    }

    if (!stationKey) {
      return {
        ok: false,
        publicUid: null,
        message:
          'CPK StationKey is not configured. Set CPK_STATION_KEY in .env.',
        data: null,
      };
    }

    const result = await this.cpkHttpClient.post('GetPublicUID', {
      McID: mcId,
      StationKey: stationKey,
    });
    const fetchElapsed = Date.now() - started;
    this.logger.debug(`PublicUID fetch completed in ${fetchElapsed}ms`);

    if (!result.ok || !result.data || typeof result.data !== 'object') {
      await this.cpkTokenRepository.clear();
      return {
        ok: false,
        publicUid: null,
        message: result.cpkMessage ?? result.error ?? 'GetPublicUID failed',
        data: typeof result.data === 'object' ? result.data : null,
      };
    }

    const data = result.data as CpkResponseBody;
    const publicUid = data.PublicUID;
    const expiredDate = data.ExpiredDate;

    if (!publicUid) {
      await this.cpkTokenRepository.clear();
      return {
        ok: false,
        publicUid: null,
        message: data.Message ?? 'GetPublicUID returned no PublicUID',
        data,
      };
    }

    const expiredAt = expiredDate
      ? new Date(expiredDate)
      : new Date(Date.now() + 60 * 60 * 1000);

    await this.cpkTokenRepository.saveToken(String(publicUid), expiredAt);
    this.logger.debug(`PublicUID saved to cache in ${Date.now() - started}ms`);

    return {
      ok: true,
      publicUid: String(publicUid),
      message: 'OK',
      data,
    };
  }

  isPublicUidError(result: {
    data: CpkResponseBody | string | null;
    cpkMessage?: string | null;
  }): boolean {
    if (!result.data || typeof result.data !== 'object') {
      return false;
    }

    const message = String(
      result.cpkMessage ?? result.data.Message ?? '',
    ).toLowerCase();

    return (
      message.includes('publicuid') &&
      (message.includes('invalid') || message.includes('expired'))
    );
  }

  private isExpiredRow(cached: { publicUid?: string | null; expiredAt?: Date | string | null } | null): boolean {
    if (!cached?.publicUid || !cached.expiredAt) {
      return true;
    }
    return Date.now() >= new Date(cached.expiredAt).getTime();
  }
}
