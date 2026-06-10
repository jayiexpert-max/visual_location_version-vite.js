import { Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(private readonly boxRepository: BoxRepository) {}

  parseLayout(layout: string): ParsedLayout {
    const normalized = (layout || '1x1').trim().toLowerCase();
    const match = /^(\d+)x(\d+)$/.exec(normalized);

    if (!match) {
      return { rows: 1, cols: 1, totalSlots: 1 };
    }

    const rows = Number.parseInt(match[1], 10);
    const cols = Number.parseInt(match[2], 10);

    return {
      rows: rows > 0 ? rows : 1,
      cols: cols > 0 ? cols : 1,
      totalSlots: (rows > 0 ? rows : 1) * (cols > 0 ? cols : 1),
    };
  }

  slotNoToGridPosition(
    slotNo: number,
    rows: number,
    cols: number,
  ): { row: number; col: number } {
    const index = Math.max(slotNo - 1, 0);
    return {
      row: Math.floor(index / cols) % rows,
      col: index % cols,
    };
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

    const { rows, cols, totalSlots } = this.parseLayout(box.layout);
    const slotMap = new Map<number, Slot>();

    for (const slot of box.slots ?? []) {
      if (slot.slotNo != null) {
        slotMap.set(slot.slotNo, slot);
      }
    }

    const cells: BoxLayoutCellDto[] = [];

    for (let slotNo = 1; slotNo <= totalSlots; slotNo += 1) {
      const slot = slotMap.get(slotNo);
      const { row, col } = this.slotNoToGridPosition(slotNo, rows, cols);

      cells.push({
        slotId: slot?.id ?? 0,
        slotNo,
        row,
        col,
        highlighted: highlightSlotId != null && slot?.id === highlightSlotId,
        product: slot?.product ? this.mapProduct(slot.product) : null,
      });
    }

    return {
      boxId: box.id,
      boxCode: box.boxCode ?? '',
      layout: box.layout,
      rows,
      cols,
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
}
