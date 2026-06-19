import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InventoryReceive } from '../../../entities/inventory-receive.entity';
import { toDateOnlyString } from '../../../common/utils/date-only.util';
import { CpkService } from '../../cpk/cpk.service';
import { PdserviceService } from '../../pdservice/pdservice.service';
import type { PdservicePuidData } from '../../pdservice/pdservice.client';
import {
  EXPIRATION_SYNC_NEAR_DAYS,
  PDSERVICE_BACKFILL_LIMIT,
  cpkStationRowEffectiveRemain,
  expirationDateInSyncScope,
  expirationSyncNearDays,
  extractResPuidRows,
  expireToSql,
  normalizeCpkItemList,
  normalizeResInfoPayload,
  normalizeResNoInput,
  partNumberFromSearch,
  type ResPuidSyncRow,
} from '../utils/expiration-sync.util';

export interface PdserviceSyncResult {
  status: 'success' | 'skipped' | 'error';
  message: string;
  checked: number;
  updated: number;
  errors: number;
  skipped?: boolean;
}

export interface ExpirationSyncResult {
  status: 'success' | 'skipped' | 'error';
  message: string;
  updated: number;
  matched: number;
  total: number;
  resNo?: string;
  checked?: number;
  skippedScope?: number;
  skipped?: boolean;
  cached?: boolean;
  syncScope?: string;
  pdservice?: PdserviceSyncResult;
}

export interface ResSyncListItem {
  resNo: string;
  puidCount: number;
  lastUpdated: string | null;
}

@Injectable()
export class ExpirationSyncService {
  constructor(
    @InjectRepository(InventoryReceive)
    private readonly inventoryRepository: Repository<InventoryReceive>,
    private readonly cpkService: CpkService,
    private readonly pdserviceService: PdserviceService,
  ) {}

  async syncFromCentral(
    search = '',
    resNo = '',
  ): Promise<ExpirationSyncResult> {
    const normalizedRes = normalizeResNoInput(resNo);

    if (normalizedRes) {
      const result = await this.syncResToDb(normalizedRes);
      return {
        ...result,
        syncScope: `expired_and_${expirationSyncNearDays()}d`,
        pdservice: {
          status: 'skipped',
          message: 'PDService skipped (RES sync uses CPK expiration)',
          checked: 0,
          updated: 0,
          errors: 0,
          skipped: true,
        },
      };
    }

    const stationResult = await this.stationSyncToDb(search);
    const pdsResult = await this.syncExpirationFromPdservice(
      search,
      PDSERVICE_BACKFILL_LIMIT,
      '',
      true,
    );

    const mergedMessage =
      pdsResult.status === 'success' && pdsResult.updated > 0
        ? `${stationResult.message} | ${pdsResult.message}`
        : stationResult.message;

    return {
      ...stationResult,
      message: mergedMessage,
      syncScope: `expired_and_${expirationSyncNearDays()}d`,
      pdservice: pdsResult,
    };
  }

  async updateExpirationFromPdservice(
    puid: string,
    id?: number,
  ): Promise<{
    status: 'success' | 'error';
    message: string;
    oldDate: string | null;
    newDate: string | null;
  }> {
    const normalizedPuid = puid.trim().toUpperCase().replace(/^VL/, '');
    if (!normalizedPuid) {
      throw new BadRequestException({
        message: 'PUID is required',
        code: 'EXPIRATION_PUID_REQUIRED',
      });
    }

    const entity = id
      ? await this.inventoryRepository.findOne({ where: { id } })
      : await this.inventoryRepository.findOne({ where: { puid: normalizedPuid } });

    if (!entity) {
      throw new NotFoundException({
        message: 'Inventory record not found',
        code: 'INVENTORY_NOT_FOUND',
      });
    }

    try {
      const apiData = await this.pdserviceService.fetchByPuid(normalizedPuid);
      const oldDate = toDateOnlyString(entity.expirationDate);

      await this.applyPdserviceData(entity, apiData);

      const refreshed = await this.inventoryRepository.findOne({
        where: { id: entity.id },
      });
      const newDate = toDateOnlyString(refreshed?.expirationDate) ?? oldDate;

      let message = 'Updated all data successfully';
      if (oldDate && newDate && oldDate !== newDate) {
        message = `Data refreshed. Expiration updated from ${oldDate} to ${newDate}`;
      } else if (oldDate && newDate && oldDate === newDate) {
        message = `Data refreshed successfully. Expiration date remains ${newDate}.`;
      }

      return {
        status: 'success',
        message,
        oldDate,
        newDate,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'PDService fetch failed';
      throw new BadGatewayException({
        message,
        code: 'PDSERVICE_FETCH_FAILED',
      });
    }
  }

  async listResOptions(): Promise<string[]> {
    const rows = await this.inventoryRepository.manager.query(
      `SELECT res_no FROM (
          SELECT DISTINCT ReservationNo AS res_no
          FROM inventory_receive
          WHERE ReservationNo IS NOT NULL AND ReservationNo <> '' AND QtyRemain > 0
          UNION
          SELECT res_no FROM reservation_list WHERE res_no IS NOT NULL AND res_no <> ''
        ) t
        ORDER BY res_no DESC
        LIMIT 300`,
    );

    return rows
      .map((row: { res_no?: string }) => String(row.res_no ?? '').trim())
      .filter(Boolean);
  }

  async listResSyncList(
    search = '',
    statusFilter = 'all',
    resNo = '',
  ): Promise<ResSyncListItem[]> {
    const qb = this.inventoryRepository
      .createQueryBuilder('ir')
      .select('ir.ReservationNo', 'resNo')
      .addSelect('COUNT(*)', 'puidCount')
      .addSelect('MAX(ir.updated_at)', 'lastUpdated')
      .where('ir.QtyRemain > 0')
      .andWhere('ir.ReservationNo IS NOT NULL')
      .andWhere("ir.ReservationNo <> ''");

    this.applyExpirationFilters(qb, search, statusFilter, resNo);

    const rows = await qb
      .groupBy('ir.ReservationNo')
      .orderBy('lastUpdated', 'ASC')
      .addOrderBy('ir.ReservationNo', 'DESC')
      .limit(80)
      .getRawMany<{ resNo: string; puidCount: string; lastUpdated: Date | null }>();

    return rows.map((row) => ({
      resNo: row.resNo,
      puidCount: Number(row.puidCount) || 0,
      lastUpdated: row.lastUpdated ? row.lastUpdated.toISOString() : null,
    }));
  }

  private async stationSyncToDb(search: string): Promise<ExpirationSyncResult> {
    const partNumber = partNumberFromSearch(search);
    let cpkData: Record<string, unknown>;

    try {
      cpkData = await this.cpkService.stationInvenCheck({
        NearExpiryDays: EXPIRATION_SYNC_NEAR_DAYS,
        ...(partNumber ? { PartNumber: partNumber } : {}),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'StationInvenCheck failed';
      return {
        status: 'error',
        message,
        updated: 0,
        matched: 0,
        total: 0,
      };
    }

    const items = normalizeCpkItemList(cpkData.Items ?? cpkData.items);
    let updated = 0;
    let matched = 0;
    let skippedScope = 0;

    for (const row of items) {
      const puid = String(row.PUID ?? '').trim();
      if (!puid) continue;

      const effectiveRemain = cpkStationRowEffectiveRemain(row);
      const qtyRemain = effectiveRemain ?? 0;
      let originalQty = Number(row.OriginalQty ?? row.Qty ?? 0) || 0;
      if (originalQty <= 0 && qtyRemain > 0) {
        originalQty = qtyRemain;
      }

      const part = String(row.PartNumber ?? '').trim();
      const batchNumber = String(row.BatchNumber ?? '').trim();
      const locationInfo = String(row.LocationInfo ?? '').trim();
      const expirationSql = expireToSql(row.ExpireDate ?? row.ExpirationDate);

      if (!expirationDateInSyncScope(expirationSql)) {
        skippedScope += 1;
        continue;
      }

      const entity = await this.inventoryRepository.findOne({ where: { puid } });
      if (!entity || ['Withdrawn', 'Empty'].includes(entity.statusName ?? '')) {
        continue;
      }

      matched += 1;
      entity.qtyRemain = qtyRemain;
      if (originalQty > 0) entity.qty = originalQty;
      if (part) entity.hanaPart = part;
      if (batchNumber) entity.lotNo = batchNumber;
      if (expirationSql) entity.expirationDate = new Date(`${expirationSql}T00:00:00`);
      if (locationInfo) entity.remark = locationInfo;

      await this.inventoryRepository.save(entity);
      updated += 1;
    }

    const synced = items.length - skippedScope;
    const scopeLabel = `expired + ${expirationSyncNearDays()}d`;

    return {
      status: 'success',
      message: `CPK: ${updated} updated (${scopeLabel}, ${synced}/${items.length} from API)`,
      updated,
      matched,
      total: synced,
      skippedScope,
    };
  }

  private async syncResToDb(resNo: string): Promise<ExpirationSyncResult> {
    let cpkPayload: Record<string, unknown>;
    try {
      cpkPayload = await this.cpkService.getResNoInfo(resNo);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'GET_RESNoInfo failed';
      return {
        status: 'error',
        message,
        resNo,
        updated: 0,
        matched: 0,
        checked: 0,
        total: 0,
      };
    }

    const normalized = normalizeResInfoPayload(cpkPayload);
    const allRows = extractResPuidRows(normalized);
    const scopedRows = await this.filterResSyncScope(allRows);
    const skippedScope = allRows.length - scopedRows.length;

    if (scopedRows.length === 0) {
      return {
        status: 'success',
        message: `RES ${resNo}: no PUID in expired/7-day scope (${allRows.length} in RES, ${skippedScope} skipped)`,
        resNo,
        updated: 0,
        matched: 0,
        checked: allRows.length,
        total: 0,
        skippedScope,
      };
    }

    let updated = 0;
    let matched = 0;

    for (const row of scopedRows) {
      const entity = await this.inventoryRepository.findOne({
        where: { puid: row.puid },
      });
      if (!entity || ['Withdrawn', 'Empty'].includes(entity.statusName ?? '')) {
        continue;
      }

      matched += 1;
      entity.reservationNo = resNo;
      if (row.qtyRemain > 0) {
        entity.qtyRemain = row.qtyRemain;
        entity.qty = row.qtyRemain;
      }
      if (row.partNumber) entity.hanaPart = row.partNumber;
      if (row.batch) entity.lotNo = row.batch;
      if (row.expire) {
        entity.expirationDate = new Date(`${row.expire}T00:00:00`);
      }

      await this.inventoryRepository.save(entity);
      updated += 1;
    }

    const scopeLabel = `expired + ${expirationSyncNearDays()}d`;
    return {
      status: 'success',
      message: `RES ${resNo}: ${updated} updated (${scopeLabel}, ${scopedRows.length} PUID in scope)`,
      resNo,
      updated,
      matched,
      checked: scopedRows.length,
      total: scopedRows.length,
      skippedScope,
    };
  }

  private async filterResSyncScope(
    rows: ResPuidSyncRow[],
  ): Promise<ResPuidSyncRow[]> {
    const scoped: ResPuidSyncRow[] = [];
    const needLocal: ResPuidSyncRow[] = [];

    for (const row of rows) {
      if (expirationDateInSyncScope(row.expire)) {
        scoped.push(row);
      } else {
        needLocal.push(row);
      }
    }

    if (needLocal.length === 0) return scoped;

    const puids = needLocal.map((row) => row.puid);
    const localRows = await this.inventoryRepository.find({
      where: {
        puid: In(puids),
      },
      select: ['puid', 'expirationDate', 'qtyRemain', 'statusName'],
    });

    const localMap = new Map(
      localRows.map((row) => [
        row.puid ?? '',
        expireToSql(row.expirationDate),
      ]),
    );

    for (const row of needLocal) {
      const localExp = localMap.get(row.puid) ?? null;
      if (localExp && expirationDateInSyncScope(localExp)) {
        scoped.push({ ...row, expire: localExp });
      }
    }

    return scoped;
  }

  private async syncExpirationFromPdservice(
    search = '',
    limit = PDSERVICE_BACKFILL_LIMIT,
    resNo = '',
    onlyMissingExpiration = false,
  ): Promise<PdserviceSyncResult> {
    const cappedLimit = Math.max(1, Math.min(limit, 200));
    const qb = this.inventoryRepository
      .createQueryBuilder('ir')
      .select(['ir.id', 'ir.puid'])
      .where('ir.QtyRemain > 0')
      .andWhere(
        `ir.ExpirationDate <= DATE_ADD(CURDATE(), INTERVAL ${EXPIRATION_SYNC_NEAR_DAYS} DAY)`,
      );

    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      const term = `%${trimmedSearch}%`;
      qb.andWhere(
        '(ir.HanaPart LIKE :term OR ir.IM LIKE :term OR ir.PUID LIKE :term)',
        { term },
      );
    }

    const trimmedRes = normalizeResNoInput(resNo);
    if (trimmedRes) {
      qb.andWhere('ir.ReservationNo = :resNo', { resNo: trimmedRes });
    }

    if (onlyMissingExpiration) {
      qb.andWhere(
        "(ir.ExpirationDate IS NULL OR ir.ExpirationDate = '' OR ir.ExpirationDate = '0000-00-00')",
      );
    }

    const rows = await qb
      .orderBy('ir.updated_at', 'ASC')
      .addOrderBy('ir.ExpirationDate', 'ASC')
      .take(cappedLimit)
      .getMany();

    if (rows.length === 0) {
      return {
        status: 'skipped',
        message: onlyMissingExpiration
          ? 'PDService: no PUID missing expiration in scope'
          : 'PDService: no PUID in scope',
        checked: 0,
        updated: 0,
        errors: 0,
        skipped: true,
      };
    }

    let checked = 0;
    let updated = 0;
    let errors = 0;

    for (const row of rows) {
      checked += 1;
      const puid = row.puid?.trim();
      if (!puid) {
        errors += 1;
        continue;
      }

      try {
        const apiData = await this.pdserviceService.fetchByPuid(puid);
        const entity = await this.inventoryRepository.findOne({
          where: { id: row.id },
        });
        if (!entity) {
          errors += 1;
          continue;
        }

        await this.applyPdserviceData(entity, apiData);
        updated += 1;
      } catch {
        errors += 1;
      }
    }

    return {
      status: 'success',
      message: `PDService: checked ${checked}, updated ${updated}${errors > 0 ? `, errors ${errors}` : ''}`,
      checked,
      updated,
      errors,
    };
  }

  private async applyPdserviceData(
    entity: InventoryReceive,
    apiData: PdservicePuidData,
  ): Promise<void> {
    const expiration = expireToSql(apiData.ExpirationDate);
    if (expiration) {
      entity.expirationDate = new Date(`${expiration}T00:00:00`);
    }

    if (apiData.IM != null) entity.im = String(apiData.IM);
    if (apiData.Customer != null) entity.customer = String(apiData.Customer);
    if (apiData.HanaPart != null) entity.hanaPart = String(apiData.HanaPart);
    if (apiData.Description != null) entity.description = String(apiData.Description);
    if (apiData.MnfPartNo != null) entity.mnfPartNo = String(apiData.MnfPartNo);
    if (apiData.LotNo != null) entity.lotNo = String(apiData.LotNo);
    if (apiData.DateCode != null) entity.dateCode = String(apiData.DateCode);
    if (apiData.BinSize != null) entity.binSize = String(apiData.BinSize);
    if (apiData.McID != null && apiData.McID !== '') {
      entity.mcId = Number(apiData.McID) || null;
    }
    if (apiData.MachineName != null) entity.machineName = String(apiData.MachineName);
    if (apiData.StatusName != null) entity.statusName = String(apiData.StatusName);
    if (apiData.OldIM != null) entity.oldIm = String(apiData.OldIM);
    if (apiData.Remark != null) entity.remark = String(apiData.Remark);

    const roomTemp = expireToSql(apiData.ExpireDate_RoomTemp);
    if (roomTemp) {
      entity.expireDateRoomTemp = new Date(`${roomTemp}T00:00:00`);
    }

    await this.inventoryRepository.save(entity);
  }

  private applyExpirationFilters(
    qb: ReturnType<Repository<InventoryReceive>['createQueryBuilder']>,
    search: string,
    statusFilter: string,
    resNo: string,
  ): void {
    const trimmedRes = normalizeResNoInput(resNo);
    if (trimmedRes) {
      qb.andWhere('ir.ReservationNo = :resNo', { resNo: trimmedRes });
    }

    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      const term = `%${trimmedSearch}%`;
      qb.andWhere(
        '(ir.HanaPart LIKE :term OR ir.IM LIKE :term OR ir.PUID LIKE :term)',
        { term },
      );
    }

    switch (statusFilter) {
      case 'expired':
        qb.andWhere('ir.ExpirationDate < CURDATE()');
        break;
      case 'soon':
        qb.andWhere(
          'ir.ExpirationDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)',
        );
        break;
      case 'normal':
        qb.andWhere('ir.ExpirationDate > DATE_ADD(CURDATE(), INTERVAL 7 DAY)');
        break;
      case 'all_stock':
        break;
      default:
        qb.andWhere(
          'ir.ExpirationDate <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)',
        );
        break;
    }
  }
}
