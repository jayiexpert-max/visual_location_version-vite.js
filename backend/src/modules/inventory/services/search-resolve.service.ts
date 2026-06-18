import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BoxRepository } from '../../warehouse/repositories/box.repository';
import { InventoryReceiveRepository } from '../repositories/inventory-receive.repository';
import { InventoryLookupService } from './inventory-lookup.service';

function normalizeSearchTerm(term: string): string {
  return term.trim().toUpperCase().replace(/^VL/i, '');
}

function puidLookupCandidates(puid: string): string[] {
  const trimmed = puid.trim();
  if (!trimmed) return [];
  const stripped = normalizeSearchTerm(trimmed);
  return [
    ...new Set(
      [trimmed, trimmed.toUpperCase(), stripped, stripped ? `VL${stripped}` : ''].filter(
        Boolean,
      ),
    ),
  ];
}

export interface SearchResolveData {
  id: number;
  qty: number;
  hanaPart: string;
  puid: string;
  searchTerm: string;
  searchMode: 'hanapart' | 'puid';
  slotId: number;
  slotNo: number;
  boxId: number;
  boxCode: string;
  layout: string;
  levelNo: number | string;
  rackName: string;
}

export interface SearchResolveResponse {
  status: 'success' | 'error';
  message?: string;
  data?: SearchResolveData;
}

interface ProductLocationRow {
  id: number;
  qty: number;
  hana_part: string;
  slot_id: number;
  slot_no: number;
  box_id: number;
  box_code: string;
  layout: string;
  level_no: number;
  rack_name: string;
}

@Injectable()
export class SearchResolveService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly boxRepository: BoxRepository,
    private readonly inventoryReceiveRepository: InventoryReceiveRepository,
    private readonly inventoryLookupService: InventoryLookupService,
  ) {}

  async resolve(rawQuery: string): Promise<SearchResolveResponse> {
    const query = normalizeSearchTerm(rawQuery);
    if (!query) {
      return {
        status: 'error',
        message: 'Please enter HanaPart or PUID',
      };
    }

    const byPart = await this.findByHanaPart(query);
    if (byPart) {
      return { status: 'success', data: byPart };
    }

    const byPuid = await this.findByPuid(query);
    if (byPuid) {
      return { status: 'success', data: byPuid };
    }

    return {
      status: 'error',
      message: `Not found: "${query}" (HanaPart or PUID in system)`,
    };
  }

  private async findByHanaPart(hanaPart: string): Promise<SearchResolveData | null> {
    const rows = await this.dataSource.query<ProductLocationRow[]>(
      `SELECT p.id, p.qty, p.name AS hana_part, sl.id AS slot_id, sl.slot_no,
              x.id AS box_id, x.box_code, x.layout, l.level_no, r.name AS rack_name
       FROM products p
       JOIN slots sl ON p.slot_id = sl.id
       JOIN boxes x ON sl.box_id = x.id
       JOIN levels l ON x.level_id = l.id
       JOIN racks r ON l.rack_id = r.id
       WHERE p.name = ?
       ORDER BY p.qty DESC
       LIMIT 1`,
      [hanaPart],
    );

    const row = rows[0];
    if (!row) return null;

    return this.mapRow(row, hanaPart, '', 'hanapart');
  }

  private async findByPuid(puid: string): Promise<SearchResolveData | null> {
    const fromLocal = await this.resolveLocationByPuid(puid);
    if (fromLocal) return fromLocal;

    const lookup = await this.inventoryLookupService.lookupByPuid(puid);
    if (lookup.status === 'success' && lookup.data?.box_id && lookup.data.slot_id) {
      const box = await this.boxRepository.findById(lookup.data.box_id);
      return {
        id: 0,
        qty: lookup.data.QtyRemain ?? lookup.data.Qty ?? 0,
        hanaPart: lookup.data.HanaPart ?? '',
        puid: lookup.data.PUID ?? puid,
        searchTerm: puid,
        searchMode: 'puid',
        slotId: lookup.data.slot_id,
        slotNo: lookup.data.Loc_Slot ?? 0,
        boxId: lookup.data.box_id,
        boxCode: lookup.data.Loc_Box ?? '',
        layout: box?.layout ?? '1x1',
        levelNo: lookup.data.Loc_Level ?? '',
        rackName: lookup.data.Loc_Shelf ?? '',
      };
    }

    const candidates = puidLookupCandidates(puid);
    const row = await this.inventoryReceiveRepository.findByPuidCandidates(candidates);
    if (row?.hanaPart) {
      const byPart = await this.findByHanaPart(row.hanaPart);
      if (byPart) {
        return {
          ...byPart,
          puid: row.puid ?? puid,
          searchTerm: puid,
          searchMode: 'puid',
          qty: row.qtyRemain ?? row.qty ?? byPart.qty,
        };
      }
    }

    return null;
  }

  private async resolveLocationByPuid(puid: string): Promise<SearchResolveData | null> {
    const candidates = puidLookupCandidates(puid);
    if (!candidates.length) return null;

    const upper = [...new Set(candidates.map((c) => c.toUpperCase()))];
    const placeholders = upper.map(() => '?').join(',');

    const rows = await this.dataSource.query<
      Array<{
        PUID: string;
        HanaPart: string;
        QtyRemain: number;
        slot_id: number | null;
        slot_no: number | null;
        box_id: number | null;
        box_code: string | null;
        layout: string | null;
        level_no: number | null;
        rack_name: string | null;
        Loc_Shelf: string | null;
        Loc_Level: string | null;
        Loc_Box: string | null;
      }>
    >(
      `SELECT ir.PUID, ir.HanaPart, ir.QtyRemain,
              ir.Loc_Shelf, ir.Loc_Level, ir.Loc_Box,
              sl.id AS slot_id, sl.slot_no,
              bx.id AS box_id, bx.box_code, bx.layout,
              lv.level_no, r.name AS rack_name
       FROM inventory_receive ir
       LEFT JOIN products p ON p.name = ir.HanaPart AND p.qty > 0
       LEFT JOIN slots sl ON p.slot_id = sl.id
       LEFT JOIN boxes bx ON sl.box_id = bx.id
       LEFT JOIN levels lv ON bx.level_id = lv.id
       LEFT JOIN racks r ON lv.rack_id = r.id
       WHERE UPPER(ir.PUID) IN (${placeholders})
         AND ir.QtyRemain > 0
         AND ir.StatusName NOT IN ('Withdrawn', 'Empty', 'Is empty')
       ORDER BY p.qty DESC
       LIMIT 1`,
      upper,
    );

    const row = rows[0];
    if (!row) return null;

    let boxId = row.box_id ?? 0;
    let slotId = row.slot_id ?? 0;
    let slotNo = row.slot_no ?? 0;
    let boxCode = row.box_code ?? '';
    let layout = row.layout ?? '1x1';
    let levelNo: number | string = row.level_no ?? row.Loc_Level ?? '';
    let rackName = row.rack_name ?? row.Loc_Shelf ?? '';

    if (!boxId && row.HanaPart) {
      const fallback = await this.findByHanaPart(row.HanaPart);
      if (fallback) {
        return {
          ...fallback,
          puid: row.PUID ?? puid,
          searchTerm: puid,
          searchMode: 'puid',
          qty: row.QtyRemain ?? fallback.qty,
        };
      }
    }

    if (!boxId) return null;

    return {
      id: 0,
      qty: row.QtyRemain ?? 0,
      hanaPart: row.HanaPart ?? '',
      puid: row.PUID ?? puid,
      searchTerm: puid,
      searchMode: 'puid',
      slotId,
      slotNo,
      boxId,
      boxCode,
      layout,
      levelNo,
      rackName,
    };
  }

  private mapRow(
    row: ProductLocationRow,
    searchTerm: string,
    puid: string,
    mode: 'hanapart' | 'puid',
  ): SearchResolveData {
    return {
      id: row.id,
      qty: row.qty,
      hanaPart: row.hana_part,
      puid,
      searchTerm,
      searchMode: mode,
      slotId: row.slot_id,
      slotNo: row.slot_no,
      boxId: row.box_id,
      boxCode: row.box_code,
      layout: row.layout ?? '1x1',
      levelNo: row.level_no,
      rackName: row.rack_name,
    };
  }
}
