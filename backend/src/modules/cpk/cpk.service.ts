import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { CpkHttpClient } from './cpk-http.client';
import { CpkTokenService } from './cpk-token.service';
import type {
  CpkHttpResult,
  CpkLogicalEndpoint,
  CpkResponseBody,
} from './interfaces/cpk.types';
import type { ClearCacheDto } from './dto/clear-cache.dto';
import type { ClosePicklistDto } from './dto/close-picklist.dto';
import type { GetPicklistDetailDto } from './dto/get-picklist-detail.dto';
import type { IssuePuidToPicklistDto } from './dto/issue-puid-to-picklist.dto';
import type { ResPuidRecvDto } from './dto/res-puid-recv.dto';
import type { StationInvenCheckDto } from './dto/station-inven-check.dto';
import type { UpdatePuidStatusDto } from './dto/update-puid-status.dto';

@Injectable()
export class CpkService {
  constructor(
    private readonly cpkHttpClient: CpkHttpClient,
    private readonly cpkTokenService: CpkTokenService,
  ) {}

  async getVersion(): Promise<CpkResponseBody | string> {
    const result = await this.cpkHttpClient.get('GetVersion');
    return this.unwrapResult(result, true);
  }

  async getResNoInfo(keyword: string): Promise<CpkResponseBody> {
    const trimmed = keyword.trim();
    if (!trimmed) {
      throw new BadRequestException('keyword is required');
    }

    const result = await this.cpkHttpClient.get('GET_RESNoInfo', trimmed);
    return this.unwrapBody(result);
  }

  async getPublicUid(forceRefresh = true): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();
    const uidResult = await this.cpkTokenService.getPublicUid(forceRefresh);

    if (!uidResult.ok || !uidResult.publicUid) {
      throw new BadGatewayException(uidResult.message);
    }

    const cached = await this.cpkTokenService.getPublicUid(false);

    return {
      PublicUID: uidResult.publicUid,
      ExpiredDate:
        uidResult.data?.ExpiredDate ??
        (cached.data?.ExpiredDate as string | undefined),
      cpk_response: uidResult.data ?? undefined,
    };
  }

  async resPuidRecv(dto: ResPuidRecvDto): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();

    const payload: Record<string, unknown> = {
      RES_NO: dto.resNo,
      PUID: dto.puid,
      Operator: dto.operator,
    };

    if (dto.location) {
      payload.Location =
        dto.location.length > 100 ? dto.location.slice(0, 100) : dto.location;
    }

    return this.postAuthenticated('RES_PUIDRecv', payload);
  }

  async updatePuidStatus(dto: UpdatePuidStatusDto): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();

    const payload: Record<string, unknown> = {
      PUID: dto.puid,
      Operator: dto.operator,
      New_Qty: String(dto.newQty),
    };

    if (dto.location) {
      payload.Location =
        dto.location.length > 100 ? dto.location.slice(0, 100) : dto.location;
    }

    return this.postAuthenticated('UpdatePUIDStatus', payload);
  }

  async getOpenPicklists(
    body: Record<string, unknown> = {},
  ): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();
    const result = await this.postAuthenticatedRaw('GetOpenPicklists', body);
    return this.normalizePicklistResponse(this.unwrapBody(result));
  }

  async getPicklistDetail(
    dto: GetPicklistDetailDto,
  ): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();
    return this.postAuthenticated('GetPicklistDetail', {
      PicklistID: dto.picklistId,
    });
  }

  async issuePuidToPicklist(
    dto: IssuePuidToPicklistDto,
  ): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();
    return this.postAuthenticated('IssuePUIDToPicklist', {
      PicklistID: dto.picklistId,
      PUID: dto.puid,
      Operator: dto.operator,
    });
  }

  async closePicklist(dto: ClosePicklistDto): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();
    return this.postAuthenticated('ClosePicklist', {
      PicklistID: dto.picklistId,
      Operator: dto.operator,
    });
  }

  async stationInvenCheck(
    dto: StationInvenCheckDto,
  ): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();
    const { picklistId, ...rest } = dto;
    const payload: Record<string, unknown> = { ...rest };
    if (picklistId) {
      payload.PicklistID = picklistId;
    }
    return this.postAuthenticated('StationInvenCheck', payload);
  }

  async clearCache(dto: ClearCacheDto): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();
    return this.postAuthenticated('ClearCache', {
      ClearTarget: dto.clearTarget ?? 'ALL',
    });
  }

  async clearLocalTokenCache(): Promise<void> {
    await this.cpkTokenService.clearCache();
  }

  buildLocation(data: {
    locShelf?: string;
    locLevel?: string | number;
    locBox?: string;
    locSlot?: string | number;
    location?: string;
  }): string {
    const parts = [
      data.locShelf ? `Rack ${data.locShelf}` : '',
      data.locLevel !== undefined && data.locLevel !== ''
        ? `L${data.locLevel}`
        : '',
      data.locBox ? `Box ${data.locBox}` : '',
      data.locSlot !== undefined && data.locSlot !== ''
        ? `Slot ${data.locSlot}`
        : '',
      data.location ?? '',
    ].filter(Boolean);

    const location = parts.join(' ').trim();
    return location.length > 100 ? location.slice(0, 100) : location;
  }

  private async postAuthenticated(
    logical: CpkLogicalEndpoint,
    body: Record<string, unknown>,
  ): Promise<CpkResponseBody> {
    const result = await this.postAuthenticatedRaw(logical, body);
    return this.unwrapBody(result);
  }

  private unwrapBody(result: CpkHttpResult): CpkResponseBody {
    const data = this.unwrapResult(result);
    if (typeof data === 'string') {
      return { Status: 'S', Message: data };
    }
    return data;
  }

  private async postAuthenticatedRaw(
    logical: CpkLogicalEndpoint,
    body: Record<string, unknown>,
  ): Promise<CpkHttpResult> {
    const uidResult = await this.cpkTokenService.getPublicUid(false);
    if (!uidResult.ok || !uidResult.publicUid) {
      return {
        ok: false,
        httpCode: 0,
        data: { Status: 'E', Message: uidResult.message },
        raw: '',
        error: uidResult.message,
        cpkStatus: 'E',
        cpkMessage: uidResult.message,
      };
    }

    const payload = { ...body, PublicUID: uidResult.publicUid };
    let result = await this.cpkHttpClient.post(logical, payload);

    if (this.cpkTokenService.isPublicUidError(result)) {
      await this.cpkTokenService.clearCache();
      const refreshed = await this.cpkTokenService.getPublicUid(true);

      if (!refreshed.ok || !refreshed.publicUid) {
        return {
          ok: false,
          httpCode: 0,
          data: { Status: 'E', Message: refreshed.message },
          raw: '',
          error: refreshed.message,
          cpkStatus: 'E',
          cpkMessage: refreshed.message,
        };
      }

      payload.PublicUID = refreshed.publicUid;
      result = await this.cpkHttpClient.post(logical, payload);
    }

    return result;
  }

  private unwrapResult(
    result: CpkHttpResult,
    allowPlainSuccess = false,
  ): CpkResponseBody | string {
    if (!result.ok) {
      const message = result.cpkMessage ?? result.error ?? 'CPK request failed';
      throw new BadGatewayException({
        message,
        code: 'CPK_REQUEST_FAILED',
        details:
          typeof result.data === 'object' && result.data !== null
            ? result.data
            : { raw: result.raw },
      });
    }

    if (allowPlainSuccess && typeof result.data === 'string') {
      return result.data;
    }

    if (typeof result.data === 'object' && result.data !== null) {
      return result.data;
    }

    return { Status: 'S', Message: 'OK' };
  }

  private normalizePicklistResponse(data: CpkResponseBody): CpkResponseBody {
    const picklists = this.extractPicklistArray(data);
    if (picklists.length === 0) {
      return data;
    }

    return {
      ...data,
      Picklists: picklists,
    };
  }

  private extractPicklistArray(data: CpkResponseBody): unknown[] {
    const keys = ['Picklists', 'OpenPicklists', 'Items', 'List'];
    for (const key of keys) {
      const value = data[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
    return [];
  }
}
