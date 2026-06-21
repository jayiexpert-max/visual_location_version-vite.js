import { Injectable } from '@nestjs/common';
import { toDateOnlyString } from '../../../common/utils/date-only.util';
import { InventoryReceive } from '../../../entities/inventory-receive.entity';
import { AppSettingsService } from '../../warehouse/services/app-settings.service';
import { InventoryReceiveRepository } from '../repositories/inventory-receive.repository';

const NEAR_EXPIRY_DAYS = 7;

export interface FifoExpiredRoll {
  puid: string;
  expiration_date: string;
  expiration_display: string;
  loc_box: string;
}

export interface PicklistFifoValidation {
  ok: boolean;
  message: string;
  skip?: boolean;
  renewal_notice?: boolean;
  renewal_required?: boolean;
  recommended_puid?: string;
  expired_rolls?: FifoExpiredRoll[];
  dummy_batch?: boolean;
  fifo_mode?: string;
  item?: InventoryReceive;
}

@Injectable()
export class FifoService {
  constructor(
    private readonly inventoryReceiveRepository: InventoryReceiveRepository,
    private readonly appSettingsService: AppSettingsService,
  ) {}

  normalizePuid(puid: string): string {
    return puid.trim().toUpperCase().replace(/^VL/, '');
  }

  async getFifoList(hanaPart: string, limit = 20): Promise<InventoryReceive[]> {
    const dummyImMarker = await this.appSettingsService.getFifoDummyImMarker();
    return this.inventoryReceiveRepository.findFifoByHanaPart(hanaPart, limit, {
      dummyImMarker,
      nearExpiryDays: NEAR_EXPIRY_DAYS,
    });
  }

  async fetchExpiredRolls(hanaPart: string, limit = 12): Promise<FifoExpiredRoll[]> {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.inventoryReceiveRepository
      .getRepository()
      .createQueryBuilder('ir')
      .where('ir.hanaPart = :hanaPart', { hanaPart })
      .andWhere('ir.qtyRemain > 0')
      .andWhere("ir.statusName NOT IN ('Withdrawn', 'Empty', 'Is empty')")
      .andWhere('ir.expirationDate IS NOT NULL')
      .andWhere('DATE(ir.expirationDate) < :today', { today })
      .orderBy('ir.expirationDate', 'ASC')
      .addOrderBy('ir.id', 'ASC')
      .take(limit)
      .getMany();

    return rows.map((row) => ({
      puid: row.puid ?? '',
      expiration_date: toDateOnlyString(row.expirationDate) ?? '',
      expiration_display: this.formatExpirationDisplay(row.expirationDate),
      loc_box: row.locBox ?? '',
    }));
  }

  async validateForPicklistIssue(puid: string): Promise<PicklistFifoValidation> {
    const normalized = this.normalizePuid(puid);
    if (!normalized) {
      return { ok: false, message: 'PUID is required' };
    }

    const fifoMode = await this.appSettingsService.getFifoIssueMode();

    const item = await this.inventoryReceiveRepository.findByPuidCandidates([
      normalized,
      `VL${normalized}`,
    ]);

    if (!item?.hanaPart) {
      return { ok: true, message: 'no_local_inventory_skip', skip: true, fifo_mode: fifoMode };
    }

    const hanaPart = item.hanaPart.trim();
    const fifo = await this.getFifoList(hanaPart, 8);
    const recommended = fifo[0]?.puid ?? null;
    const expiredRolls = await this.fetchExpiredRolls(hanaPart);
    const renewalNotice = expiredRolls.length > 0;

    const qtyRemain = Number(item.qtyRemain ?? 0);
    const status = String(item.statusName ?? '');
    const isReferenceOnly =
      qtyRemain <= 0 || status === 'Withdrawn' || status === 'Empty';

    if (isReferenceOnly) {
      return {
        ok: true,
        message: 'Old/empty PUID reference accepted',
        item,
        recommended_puid: recommended ?? undefined,
        expired_rolls: expiredRolls,
        renewal_notice: renewalNotice,
        fifo_mode: fifoMode,
      };
    }

    const scanTier = this.expiryTier(item.expirationDate);
    if (scanTier === 'expired') {
      return {
        ok: false,
        message: recommended
          ? `PUID expired — send for shelf-life extension. Use: ${recommended}`
          : 'PUID expired — send for shelf-life extension',
        recommended_puid: recommended ?? undefined,
        expired_rolls: expiredRolls,
        renewal_required: true,
        item,
        fifo_mode: fifoMode,
      };
    }

    if (await this.appSettingsService.isDummyBatchIm(item.im)) {
      return {
        ok: true,
        message: 'PUID OK — Dummy Batch (FIFO bypass)',
        item,
        recommended_puid: recommended ?? undefined,
        expired_rolls: expiredRolls,
        renewal_notice: renewalNotice,
        dummy_batch: true,
        fifo_mode: fifoMode,
      };
    }

    const older = await this.findOlderStock(hanaPart, item);
    if (older) {
      const blockPuid = this.normalizePuid(older.puid ?? '') || recommended || '';
      return {
        ok: false,
        message: blockPuid
          ? `FEFO violation — issue ${blockPuid} first (earlier expiration)`
          : 'FEFO violation — issue earlier-expiration stock first',
        recommended_puid: blockPuid || undefined,
        expired_rolls: expiredRolls,
        item,
        fifo_mode: fifoMode,
      };
    }

    if (recommended && recommended.toUpperCase() !== normalized) {
      const sameExp = this.sameExpirationDate(
        item.expirationDate,
        fifo[0]?.expirationDate ?? null,
      );
      if (!sameExp) {
        const tier = scanTier;
        const strictMsg =
          tier === 'fresh' || tier === 'unknown'
            ? `Cannot issue long-life stock yet. Issue near-expiry ${recommended} first.`
            : `FEFO violation! Issue ${recommended} first (earlier expiration)`;
        return {
          ok: false,
          message: strictMsg,
          recommended_puid: recommended,
          expired_rolls: expiredRolls,
          item,
          fifo_mode: fifoMode,
        };
      }
    }

    return {
      ok: true,
      message: 'PUID OK for picklist issue',
      item,
      recommended_puid: recommended ?? undefined,
      expired_rolls: expiredRolls,
      renewal_notice: renewalNotice,
      fifo_mode: fifoMode,
    };
  }

  private async findOlderStock(
    hanaPart: string,
    item: InventoryReceive,
  ): Promise<InventoryReceive | null> {
    const tier = this.expiryTier(item.expirationDate);
    if (tier === 'expired') return null;

    const dummyImMarker = await this.appSettingsService.getFifoDummyImMarker();
    const repo = this.inventoryReceiveRepository.getRepository();
    const today = new Date().toISOString().slice(0, 10);
    const nearCutoff = new Date();
    nearCutoff.setDate(nearCutoff.getDate() + NEAR_EXPIRY_DAYS);
    const nearDate = nearCutoff.toISOString().slice(0, 10);

    const baseQb = () => {
      const qb = repo
        .createQueryBuilder('ir')
        .where('ir.hanaPart = :hanaPart', { hanaPart })
        .andWhere('ir.qtyRemain > 0')
        .andWhere("ir.statusName NOT IN ('Withdrawn', 'Empty', 'Is empty')")
        .andWhere('ir.expirationDate IS NOT NULL')
        .andWhere('DATE(ir.expirationDate) >= :today', { today });

      if (dummyImMarker.trim()) {
        qb.andWhere(
          `(ir.im IS NULL OR ir.im = '' OR UPPER(ir.im) NOT LIKE :dummyPattern)`,
          { dummyPattern: `%${dummyImMarker.toUpperCase()}%` },
        );
      }
      return qb;
    };

    if (tier === 'fresh' || tier === 'unknown') {
      return baseQb()
        .andWhere('DATE(ir.expirationDate) <= :nearDate', { nearDate })
        .orderBy('ir.expirationDate', 'ASC')
        .addOrderBy('ir.im', 'ASC')
        .addOrderBy('ir.id', 'ASC')
        .getOne();
    }

    const scanExp = toDateOnlyString(item.expirationDate);
    if (!scanExp) return null;

    return baseQb()
      .andWhere('DATE(ir.expirationDate) < :scanExp', { scanExp })
      .orderBy('ir.expirationDate', 'ASC')
      .addOrderBy('ir.im', 'ASC')
      .addOrderBy('ir.id', 'ASC')
      .getOne();
  }

  private expiryTier(date: Date | string | null | undefined): 'expired' | 'near' | 'fresh' | 'unknown' {
    const exp = this.normalizeExpiration(date);
    if (!exp) return 'unknown';
    const today = new Date().toISOString().slice(0, 10);
    if (exp < today) return 'expired';
    const nearCutoff = new Date();
    nearCutoff.setDate(nearCutoff.getDate() + NEAR_EXPIRY_DAYS);
    if (exp <= nearCutoff.toISOString().slice(0, 10)) return 'near';
    return 'fresh';
  }

  private sameExpirationDate(
    a: Date | string | null | undefined,
    b: Date | string | null | undefined,
  ): boolean {
    const na = this.normalizeExpiration(a);
    const nb = this.normalizeExpiration(b);
    if (!na && !nb) return true;
    return na !== null && na === nb;
  }

  private normalizeExpiration(date: Date | string | null | undefined): string | null {
    return toDateOnlyString(date);
  }

  private formatExpirationDisplay(date: Date | string | null | undefined): string {
    const exp = this.normalizeExpiration(date);
    if (!exp) return '-';
    const [y, m, d] = exp.split('-');
    return `${d}/${m}/${y}`;
  }
}
