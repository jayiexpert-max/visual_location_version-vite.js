import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InventoryReceive } from '../../entities/inventory-receive.entity';
import { Material } from '../../entities/material.entity';
import { toDateOnlyString } from '../../common/utils/date-only.util';
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

interface ParsedBomLine {
  itemList: unknown;
  opCode: unknown;
  materialCode: string;
  requiredQty: number;
}

interface StockAggregate {
  systemQty: number;
  usableQty: number;
  puidCount: number;
  recommendedPuid: string | null;
  earliestExpiration: string | null;
  expiryStatus: 'ok' | 'near' | 'expired' | 'unknown';
  expiredRolls: number;
  nearExpiryRolls: number;
  substoreStockQty: number;
  substorePuidCount: number;
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

    const operations = asList(data?.Operations) as Record<string, unknown>[];
    const parsedLines: ParsedBomLine[] = [];

    for (const op of operations) {
      if (!op || typeof op !== 'object') continue;
      const materials = asList(op.MaterialList) as Record<string, unknown>[];
      for (const mat of materials) {
        if (!mat || typeof mat !== 'object') continue;
        const materialCode = materialPartNumber(mat);
        if (!materialCode) continue;
        const requiredQty = parseRequiredQty(mat);
        if (requiredQty === null) continue;
        parsedLines.push({
          itemList: mat.MatItem ?? null,
          opCode: op.OpnCode ?? null,
          materialCode,
          requiredQty,
        });
      }
    }

    if (!parsedLines.length) {
      throw new BadGatewayException(
        'No BOM lines with numeric required quantity (MatReqQty)',
      );
    }

    const materialCodes = [...new Set(parsedLines.map((line) => line.materialCode))];
    const [materials, stockMap] = await Promise.all([
      this.materialRepo.find({
        where: { materialCode: In(materialCodes) },
      }),
      this.fetchStockAggregates(materialCodes),
    ]);

    const materialMap = new Map(
      materials.map((material) => [material.materialCode, material]),
    );

    const lines: WoBomPlanLine[] = parsedLines.map((line) => {
      const material = materialMap.get(line.materialCode);
      const stock = stockMap.get(line.materialCode) ?? this.emptyStockAggregate();

      return {
        itemList: line.itemList,
        opCode: line.opCode,
        materialCode: line.materialCode,
        description: material?.description ?? '—',
        requiredPerUnit: line.requiredQty,
        requiredQty: line.requiredQty,
        systemStockQty: stock.systemQty,
        usableStockQty: stock.usableQty,
        puidCount: stock.puidCount,
        recommendedPuid: stock.recommendedPuid,
        earliestExpiration: stock.earliestExpiration,
        expiryStatus: stock.expiryStatus,
        expiredRolls: stock.expiredRolls,
        nearExpiryRolls: stock.nearExpiryRolls,
        substoreStockQty: stock.substoreStockQty,
        substorePuidCount: stock.substorePuidCount,
        sufficient: stock.usableQty >= line.requiredQty,
      };
    });

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

  private emptyStockAggregate(): StockAggregate {
    return {
      systemQty: 0,
      usableQty: 0,
      puidCount: 0,
      recommendedPuid: null,
      earliestExpiration: null,
      expiryStatus: 'unknown',
      expiredRolls: 0,
      nearExpiryRolls: 0,
      substoreStockQty: 0,
      substorePuidCount: 0,
    };
  }

  private async fetchStockAggregates(
    hanaParts: string[],
  ): Promise<Map<string, StockAggregate>> {
    if (!hanaParts.length) return new Map();

    const rows = await this.inventoryRepo
      .createQueryBuilder('ir')
      .where('ir.hanaPart IN (:...hanaParts)', { hanaParts })
      .andWhere('ir.qtyRemain > 0')
      .andWhere("ir.statusName NOT IN ('Withdrawn', 'Empty', 'Is empty')")
      .orderBy('ir.hanaPart', 'ASC')
      .orderBy('CASE WHEN ir.expirationDate IS NULL THEN 1 ELSE 0 END', 'ASC')
      .addOrderBy('ir.expirationDate', 'ASC')
      .addOrderBy('ir.id', 'ASC')
      .getMany();

    const today = new Date().toISOString().slice(0, 10);
    const nearDate = new Date();
    nearDate.setDate(nearDate.getDate() + 7);
    const nearStr = nearDate.toISOString().slice(0, 10);
    const aggregates = new Map<string, StockAggregate>();
    const seenPuids = new Map<string, Set<string>>();
    const seenSubstorePuids = new Map<string, Set<string>>();

    for (const row of rows) {
      const hanaPart = row.hanaPart?.trim();
      if (!hanaPart) continue;

      const aggregate =
        aggregates.get(hanaPart) ?? this.emptyStockAggregate();
      const puids = seenPuids.get(hanaPart) ?? new Set<string>();
      const substorePuids =
        seenSubstorePuids.get(hanaPart) ?? new Set<string>();
      const qty = Number(row.qtyRemain ?? 0);
      aggregate.systemQty += qty;
      const exp = toDateOnlyString(row.expirationDate);
      if (!exp || exp >= today) aggregate.usableQty += qty;
      if (exp && exp < today) aggregate.expiredRolls += 1;
      else if (exp && exp >= today && exp <= nearStr) aggregate.nearExpiryRolls += 1;

      if (!aggregate.recommendedPuid) {
        aggregate.recommendedPuid = row.puid ?? null;
        aggregate.earliestExpiration = exp;
        if (!exp) aggregate.expiryStatus = 'unknown';
        else if (exp < today) aggregate.expiryStatus = 'expired';
        else if (exp <= nearStr) aggregate.expiryStatus = 'near';
        else aggregate.expiryStatus = 'ok';
      }

      if (row.puid) {
        puids.add(row.puid);
      }

      if (row.machineName?.includes('Kitting')) {
        aggregate.substoreStockQty += qty;
        if (row.puid) {
          substorePuids.add(row.puid);
        }
      }

      aggregate.puidCount = puids.size;
      aggregate.substorePuidCount = substorePuids.size;
      aggregates.set(hanaPart, aggregate);
      seenPuids.set(hanaPart, puids);
      seenSubstorePuids.set(hanaPart, substorePuids);
    }

    return aggregates;
  }
}
