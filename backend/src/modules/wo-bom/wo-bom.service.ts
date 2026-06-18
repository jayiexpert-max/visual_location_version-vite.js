import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryReceive } from '../../entities/inventory-receive.entity';
import { Material } from '../../entities/material.entity';
import { CpkHttpClient } from '../cpk/cpk-http.client';
import type { CpkResponseBody } from '../cpk/interfaces/cpk.types';

export interface WoBomPlanLine {
  itemList: unknown;
  opCode: unknown;
  materialCode: string;
  description: string;
  requiredPerUnit: number;
  requiredQty: number;
  systemStockQty: number;
  usableStockQty: number;
  puidCount: number;
  recommendedPuid: string | null;
  earliestExpiration: string | null;
  expiryStatus: 'ok' | 'near' | 'expired' | 'unknown';
  expiredRolls: number;
  nearExpiryRolls: number;
  substoreStockQty: number;
  substorePuidCount: number;
  sufficient: boolean;
}

export interface WoBomPlanInfo {
  workOrder: string;
  assemblyName: string;
  assemblyRevision: string;
  dataUpdatedTime: string;
}

export interface WoBomPlanResult {
  workOrder: string;
  info: WoBomPlanInfo;
  lines: WoBomPlanLine[];
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return [];
}

function materialPartNumber(mat: Record<string, unknown>): string {
  return String(mat.PartNumber ?? mat.MatNumber ?? '').trim();
}

function parseRequiredQty(mat: Record<string, unknown>): number | null {
  for (const key of ['MatReqQty', 'ReqQty', 'RequiredQty', 'Quantity']) {
    const raw = mat[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const n = parseFloat(String(raw).replace(',', '.'));
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return null;
}

function cpkSuccess(data: CpkResponseBody | null): boolean {
  if (!data) return false;
  if (data.Status === 'S') return true;
  if (data.Status === 'E') return false;
  return true;
}

@Injectable()
export class WoBomService {
  constructor(
    private readonly cpkHttpClient: CpkHttpClient,
    @InjectRepository(InventoryReceive)
    private readonly inventoryRepo: Repository<InventoryReceive>,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
  ) {}

  async getBomPlan(workOrder: string): Promise<WoBomPlanResult> {
    const wo = workOrder.trim();
    if (!wo) {
      throw new BadRequestException('Work Order is required');
    }

    const result = await this.cpkHttpClient.get('GET_WOBOMInfo', wo);
    const data = (result.data ?? null) as CpkResponseBody | null;

    if (!result.ok || !cpkSuccess(data)) {
      throw new BadGatewayException(
        result.cpkMessage ?? result.error ?? 'Failed to load WO BOM from CPK',
      );
    }

    const lines: WoBomPlanLine[] = [];
    const operations = asList(data?.Operations) as Record<string, unknown>[];

    for (const op of operations) {
      if (!op || typeof op !== 'object') continue;
      const materials = asList(op.MaterialList) as Record<string, unknown>[];
      for (const mat of materials) {
        if (!mat || typeof mat !== 'object') continue;
        const materialCode = materialPartNumber(mat);
        if (!materialCode) continue;
        const requiredQty = parseRequiredQty(mat);
        if (requiredQty === null) continue;

        const material = await this.materialRepo.findOne({
          where: { materialCode },
        });
        const stock = await this.fetchSystemStock(materialCode);
        const substore = await this.fetchSubstoreStock(materialCode);

        lines.push({
          itemList: mat.MatItem ?? null,
          opCode: op.OpnCode ?? null,
          materialCode,
          description: material?.description ?? '—',
          requiredPerUnit: requiredQty,
          requiredQty,
          systemStockQty: stock.systemQty,
          usableStockQty: stock.usableQty,
          puidCount: stock.puidCount,
          recommendedPuid: stock.recommendedPuid,
          earliestExpiration: stock.earliestExpiration,
          expiryStatus: stock.expiryStatus,
          expiredRolls: stock.expiredRolls,
          nearExpiryRolls: stock.nearExpiryRolls,
          substoreStockQty: substore.total,
          substorePuidCount: substore.puidCount,
          sufficient: stock.usableQty >= requiredQty,
        });
      }
    }

    if (!lines.length) {
      throw new BadGatewayException(
        'No BOM lines with numeric required quantity (MatReqQty)',
      );
    }

    return {
      workOrder: wo,
      info: {
        workOrder: String(data?.WorkOrder ?? wo),
        assemblyName: String(data?.AssemblyName ?? '—'),
        assemblyRevision: String(data?.AssemblyRevision ?? '—'),
        dataUpdatedTime: String(data?.DataUpdatedTime ?? '—'),
      },
      lines,
    };
  }

  private async fetchSystemStock(hanaPart: string): Promise<{
    systemQty: number;
    usableQty: number;
    puidCount: number;
    recommendedPuid: string | null;
    earliestExpiration: string | null;
    expiryStatus: 'ok' | 'near' | 'expired' | 'unknown';
    expiredRolls: number;
    nearExpiryRolls: number;
  }> {
    const rows = await this.inventoryRepo
      .createQueryBuilder('ir')
      .where('ir.hanaPart = :hanaPart', { hanaPart })
      .andWhere('ir.qtyRemain > 0')
      .andWhere("ir.statusName NOT IN ('Withdrawn', 'Empty', 'Is empty')")
      .orderBy('CASE WHEN ir.expirationDate IS NULL THEN 1 ELSE 0 END', 'ASC')
      .addOrderBy('ir.expirationDate', 'ASC')
      .addOrderBy('ir.id', 'ASC')
      .getMany();

    let systemQty = 0;
    let usableQty = 0;
    let expiredRolls = 0;
    let nearExpiryRolls = 0;
    const today = new Date().toISOString().slice(0, 10);
    const nearDate = new Date();
    nearDate.setDate(nearDate.getDate() + 7);
    const nearStr = nearDate.toISOString().slice(0, 10);

    for (const row of rows) {
      const qty = Number(row.qtyRemain ?? 0);
      systemQty += qty;
      const exp = row.expirationDate ? String(row.expirationDate).slice(0, 10) : null;
      if (!exp || exp >= today) usableQty += qty;
      if (exp && exp < today) expiredRolls += 1;
      else if (exp && exp >= today && exp <= nearStr) nearExpiryRolls += 1;
    }

    const fifo = rows[0];
    const fifoExp = fifo?.expirationDate
      ? String(fifo.expirationDate).slice(0, 10)
      : null;
    let expiryStatus: 'ok' | 'near' | 'expired' | 'unknown' = 'unknown';
    if (fifoExp) {
      if (fifoExp < today) expiryStatus = 'expired';
      else if (fifoExp <= nearStr) expiryStatus = 'near';
      else expiryStatus = 'ok';
    }

    return {
      systemQty,
      usableQty,
      puidCount: new Set(rows.map((r) => r.puid).filter(Boolean)).size,
      recommendedPuid: fifo?.puid ?? null,
      earliestExpiration: fifoExp,
      expiryStatus,
      expiredRolls,
      nearExpiryRolls,
    };
  }

  private async fetchSubstoreStock(hanaPart: string): Promise<{ total: number; puidCount: number }> {
    const row = await this.inventoryRepo
      .createQueryBuilder('ir')
      .select('COALESCE(SUM(ir.qtyRemain), 0)', 'total')
      .addSelect('COUNT(DISTINCT ir.puid)', 'puidCount')
      .where('ir.hanaPart = :hanaPart', { hanaPart })
      .andWhere('ir.qtyRemain > 0')
      .andWhere("ir.statusName NOT IN ('Withdrawn', 'Empty')")
      .andWhere('ir.machineName LIKE :like', { like: '%Kitting%' })
      .getRawOne<{ total: string; puidCount: string }>();

    return {
      total: parseFloat(row?.total ?? '0') || 0,
      puidCount: parseInt(row?.puidCount ?? '0', 10) || 0,
    };
  }
}
