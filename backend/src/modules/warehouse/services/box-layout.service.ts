import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Box } from '../../../entities/box.entity';
import { Slot } from '../../../entities/slot.entity';
import { BoxRepository } from '../repositories/box.repository';
import {
  BoxLayoutCellDto,
  BoxLayoutProductDto,
  BoxLayoutResponseDto,
} from '../dto/box-layout-response.dto';

export interface ParsedLayout {
  rows: number;
  cols: number;
  totalSlots: number;
}

@Injectable()
export class BoxLayoutService {
  constructor(
    private readonly boxRepository: BoxRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  parseLayout(layout: string): ParsedLayout {
    const normalized = (layout || '1x1').trim().toLowerCase();
    const match = /^(\d+)x(\d+)$/.exec(normalized);

    if (!match) {
      return { rows: 1, cols: 1, totalSlots: 1 };
    }

    // WxH — W = columns (PHP rack-slot-layout.js), H = row capacity
    const cols = Number.parseInt(match[1], 10);
    const rows = Number.parseInt(match[2], 10);

    return {
      rows: rows > 0 ? rows : 1,
      cols: cols > 0 ? cols : 1,
      totalSlots: (cols > 0 ? cols : 1) * (rows > 0 ? rows : 1),
    };
  }

  /** PHP search_product / rack-slot-layout: slot 1 = bottom-left. */
  slotNoToGridPosition(
    slotNo: number,
    gridCols: number,
    gridRowsVisual: number,
  ): { row: number; col: number } {
    const index = Math.max(slotNo - 1, 0);
    const col = Math.floor(index / gridRowsVisual);
    const row = gridRowsVisual - 1 - (index % gridRowsVisual);
    return { row, col };
  }

  async getBoxLayout(
    boxId: number,
    highlightSlotId?: number,
  ): Promise<BoxLayoutResponseDto> {
    const box = await this.boxRepository.findByIdWithSlots(boxId);

    if (!box) {
      throw new NotFoundException({
        message: `Box ${boxId} not found`,
        code: 'WAREHOUSE_BOX_NOT_FOUND',
      });
    }

    const { rows: rowCapacity, cols: gridCols, totalSlots } = this.parseLayout(box.layout);
    const gridRowsVisual = Math.max(1, Math.ceil(totalSlots / gridCols));
    const slotMap = new Map<number, Slot>();

    for (const slot of box.slots ?? []) {
      if (slot.slotNo != null) {
        slotMap.set(slot.slotNo, slot);
      }
    }

    const puidsBySlotId = await this.fetchPuidsForBox(box, slotMap);

    const cells: BoxLayoutCellDto[] = [];

    for (let slotNo = 1; slotNo <= totalSlots; slotNo += 1) {
      const slot = slotMap.get(slotNo);
      const { row, col } = this.slotNoToGridPosition(slotNo, gridCols, gridRowsVisual);

      cells.push({
        slotId: slot?.id ?? 0,
        slotNo,
        row,
        col,
        highlighted: highlightSlotId != null && slot?.id === highlightSlotId,
        product: slot?.product ? this.mapProduct(slot.product) : null,
        puids: slot?.id ? (puidsBySlotId.get(slot.id) ?? []) : [],
      });
    }

    return {
      boxId: box.id,
      boxCode: box.boxCode ?? '',
      layout: box.layout,
      rows: gridRowsVisual,
      cols: gridCols,
      rackId: box.level?.rack?.id ?? null,
      rackName: box.level?.rack?.name ?? null,
      levelNo: box.level?.levelNo ?? null,
      cells,
    };
  }

  private mapProduct(product: NonNullable<Slot['product']>): BoxLayoutProductDto {
    return {
      id: product.id,
      name: product.name ?? '',
      qty: product.qty,
      remark: product.remark,
    };
  }

  /** Mirrors PHP wh_fetch_puids_for_box_slot via box_layout_service.php */
  private async fetchPuidsForBox(
    box: Box,
    slotMap: Map<number, Slot>,
  ): Promise<Map<number, string[]>> {
    const result = new Map<number, string[]>();
    const rackName = box.level?.rack?.name ?? '';
    const levelNo = box.level?.levelNo ?? 0;
    const boxCode = box.boxCode ?? '';

    for (const slot of slotMap.values()) {
      const hanaPart = slot.product?.name?.trim() ?? '';
      if (!hanaPart || !slot.id) continue;

      let puids = await this.queryPuidsBySlot(slot.id, hanaPart);

      if (puids.length === 0 && rackName && boxCode) {
        puids = await this.queryPuidsByLocation(hanaPart, rackName, levelNo, boxCode);
      }

      if (puids.length > 0) {
        result.set(slot.id, puids);
      }
    }

    return result;
  }

  private async queryPuidsBySlot(slotId: number, hanaPart: string): Promise<string[]> {
    const rows = await this.dataSource.query<Array<{ PUID: string }>>(
      `SELECT DISTINCT ir.PUID
       FROM inventory_receive ir
       JOIN products p ON p.name = ir.HanaPart AND p.slot_id = ?
       WHERE ir.HanaPart = ?
         AND ir.QtyRemain > 0
         AND ir.StatusName NOT IN ('Withdrawn', 'Empty', 'Is empty')
       ORDER BY ir.ReceiveDate ASC`,
      [slotId, hanaPart],
    );

    return this.collectPuids(rows);
  }

  private async queryPuidsByLocation(
    hanaPart: string,
    rackName: string,
    levelNo: number,
    boxCode: string,
  ): Promise<string[]> {
    const rows = await this.dataSource.query<Array<{ PUID: string }>>(
      `SELECT DISTINCT ir.PUID
       FROM inventory_receive ir
       WHERE ir.HanaPart = ?
         AND ir.QtyRemain > 0
         AND ir.StatusName NOT IN ('Withdrawn', 'Empty', 'Is empty')
         AND ir.Loc_Shelf = ?
         AND CAST(ir.Loc_Level AS UNSIGNED) = ?
         AND ir.Loc_Box = ?
       ORDER BY ir.ReceiveDate ASC`,
      [hanaPart, rackName, levelNo, boxCode],
    );

    return this.collectPuids(rows);
  }

  private collectPuids(rows: Array<{ PUID: string }>): string[] {
    const puids: string[] = [];
    for (const row of rows) {
      const puid = String(row.PUID ?? '').trim();
      if (puid) puids.push(puid);
    }
    return [...new Set(puids)];
  }
}
