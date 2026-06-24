import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
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
import type { BookingOutPuidDto } from './dto/booking-out-puid.dto';
import {
  extractDetailLines,
  extractRequestBy,
  filterRequiredOnlyLines,
  isRequiredOnlyServiceError,
  stripMetaLines,
} from './utils/picklist-line.utils';

@Injectable()
export class CpkService {
  private readonly logger = new Logger(CpkService.name);

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
    const picklistId = dto.picklistId.trim();
    const requiredOnly = Boolean(dto.requiredOnly);
    const basePayload = { PicklistID: picklistId };

    let filteredLocally = false;
    let sentRequiredOnlyToCpk = false;
    let data: CpkResponseBody;

    let rawLineCount = 0;

    if (requiredOnly) {
      sentRequiredOnlyToCpk = true;
      try {
        data = await this.postAuthenticated('GetPicklistDetail', {
          ...basePayload,
          RequiredOnly: true,
        });
        if (String(data.Status ?? '').toUpperCase() === 'E' || isRequiredOnlyServiceError(data.Message)) {
          throw new BadGatewayException(String(data.Message ?? 'CPK error'));
        }
        rawLineCount = extractDetailLines(data).length;
      } catch {
        data = await this.postAuthenticated('GetPicklistDetail', basePayload);
        sentRequiredOnlyToCpk = false;
        filteredLocally = true;
        rawLineCount = extractDetailLines(data).length;
        const filtered = filterRequiredOnlyLines(extractDetailLines(data));
        data = { ...data, Lines: filtered };
      }
    } else {
      data = await this.postAuthenticated('GetPicklistDetail', basePayload);
      rawLineCount = extractDetailLines(data).length;
    }
    const requestBy = extractRequestBy(extractDetailLines(data));
    const lines = stripMetaLines(extractDetailLines(data));
    if (lines.length) {
      data = { ...data, Lines: lines };
    }

    return {
      ...data,
      Meta: {
        RequiredOnlyRequested: requiredOnly,
        RequiredOnlyFilteredLocally: filteredLocally,
        RequiredOnlySentToCpk: sentRequiredOnlyToCpk,
        LineCount: lines.length,
        LineCountRaw: rawLineCount,
        RequestBy: requestBy,
        CpkErrCode00008: isRequiredOnlyServiceError(data.Message),
      },
    };
  }

  async issuePuidToPicklistRaw(dto: IssuePuidToPicklistDto): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();
    const data = await this.postAuthenticated('IssuePUIDToPicklist', {
      PicklistID: dto.picklistId,
      PUID: dto.puid,
      Operator: dto.operator,
    });
    if (String(data.Status ?? '').toUpperCase() === 'E') {
      throw new BadGatewayException({
        message: String(data.Message ?? 'IssuePUIDToPicklist failed'),
        code: 'CPK_ISSUE_FAILED',
        details: data,
      });
    }
    return data;
  }

  async issuePuidToPicklist(
    dto: IssuePuidToPicklistDto,
  ): Promise<CpkResponseBody> {
    return this.issuePuidToPicklistRaw(dto);
  }

  async closePicklist(dto: ClosePicklistDto): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();
    const payload: Record<string, unknown> = {
      PicklistID: dto.picklistId,
      Operator: dto.operator,
    };
    if (dto.kitsNote?.trim()) {
      payload.KitsNote = dto.kitsNote.trim();
    }
    const data = await this.postAuthenticated('ClosePicklist', payload);
    const status = String(data.Status ?? '').toUpperCase();
    const closeDone =
      data.CloseDone === true ||
      status === 'S' ||
      status === 'SUCCESS';
    return {
      ...data,
      CloseDone: closeDone,
    };
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

  /** Returns CPK body even when Status=E (for preview / diagnostics). */
  async stationInvenCheckPassthrough(
    dto: StationInvenCheckDto,
  ): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();
    const { picklistId, ...rest } = dto;
    const payload: Record<string, unknown> = { ...rest };
    if (picklistId) {
      payload.PicklistID = picklistId;
    }
    return this.passthroughPost('StationInvenCheck', payload);
  }

  async bookingOutPuid(dto: BookingOutPuidDto): Promise<CpkResponseBody> {
    this.cpkTokenService.requireMcIdConfigured();
    return this.postAuthenticated('BookingOutPUID', {
      PUID: dto.puid.trim().toUpperCase(),
      Operator: dto.operator,
      Destination: dto.destination,
    });
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

  private async passthroughPost(
    logical: CpkLogicalEndpoint,
    body: Record<string, unknown>,
  ): Promise<CpkResponseBody> {
    const result = await this.postAuthenticatedRaw(logical, body);
    if (typeof result.data === 'object' && result.data !== null) {
      return result.data;
    }
    return {
      Status: result.cpkStatus ?? 'E',
      Message: result.cpkMessage ?? result.error ?? 'CPK request failed',
    };
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
    const started = Date.now();
    const uidResult = await this.cpkTokenService.getPublicUid(false);
    if (!uidResult.ok || !uidResult.publicUid) {
      this.logger.warn(
        `CPK ${logical} aborted before POST because PublicUID was unavailable (${Date.now() - started}ms)`,
      );
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
    this.logger.debug(
      `CPK ${logical} first POST completed in ${Date.now() - started}ms (publicUid cached=${true})`,
    );

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
      this.logger.debug(
        `CPK ${logical} retry POST completed in ${Date.now() - started}ms after PublicUID refresh`,
      );
    }

    this.logger.debug(`CPK ${logical} finished in ${Date.now() - started}ms`);
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
