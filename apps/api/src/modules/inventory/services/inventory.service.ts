import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InventoryReceive } from '../../../entities/inventory-receive.entity';
import { InventoryReceiveRepository } from '../repositories/inventory-receive.repository';
import { InventoryProductRepository } from '../repositories/product.repository';

export interface InventoryLocationRow {
  product_id: number;
  part_name: string;
  current_qty: number;
  product_remark: string | null;
  slot_id: number;
  slot_no: number;
  box_id: number;
  box_code: string;
  level_id: number;
  level_no: number;
  rack_id: number;
  rack_name: string;
  earliest_expiration: Date | null;
}

export interface InventorySearchResult {
  query: string;
  puidMatches: InventoryReceive[];
  hanaPartMatches: InventoryReceive[];
  locations: InventoryLocationRow[];
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryReceiveRepository: InventoryReceiveRepository,
    private readonly productRepository: InventoryProductRepository,
    private readonly dataSource: DataSource,
  ) {}

  async searchByHanaPartOrPuid(query: string): Promise<InventorySearchResult> {
    const trimmed = query.trim();

    const [puidMatches, hanaPartMatches, locations] = await Promise.all([
      this.inventoryReceiveRepository.searchByPuid(trimmed),
      this.inventoryReceiveRepository.searchByHanaPart(trimmed),
      this.searchLocations(trimmed),
    ]);

    return {
      query: trimmed,
      puidMatches,
      hanaPartMatches,
      locations,
    };
  }

  async getByPuid(puid: string): Promise<InventoryReceive> {
    const record = await this.inventoryReceiveRepository.findByPuid(puid);

    if (!record) {
      throw new NotFoundException({
        message: `PUID ${puid} not found`,
        code: 'INVENTORY_PUID_NOT_FOUND',
      });
    }

    return record;
  }

  async findLocationByPartOrSlot(
    query: string,
    slotId?: number,
  ): Promise<InventoryLocationRow | null> {
    if (slotId) {
      const rows = await this.dataSource.query<InventoryLocationRow[]>(
        `SELECT * FROM v_inventory_location WHERE slot_id = ? LIMIT 1`,
        [slotId],
      );
      return rows[0] ?? null;
    }

    const byPart = await this.dataSource.query<InventoryLocationRow[]>(
      `SELECT * FROM v_inventory_location WHERE part_name = ? ORDER BY current_qty DESC LIMIT 1`,
      [query.trim()],
    );

    if (byPart[0]) {
      return byPart[0];
    }

    const receive = await this.inventoryReceiveRepository.findByPuid(query.trim());

    if (receive?.hanaPart) {
      const byHanaPart = await this.dataSource.query<InventoryLocationRow[]>(
        `SELECT * FROM v_inventory_location WHERE part_name = ? ORDER BY current_qty DESC LIMIT 1`,
        [receive.hanaPart],
      );
      return byHanaPart[0] ?? null;
    }

    return null;
  }

  private async searchLocations(query: string): Promise<InventoryLocationRow[]> {
    return this.dataSource.query<InventoryLocationRow[]>(
      `SELECT * FROM v_inventory_location
       WHERE part_name LIKE ? OR part_name = ?
       ORDER BY current_qty DESC
       LIMIT 50`,
      [`%${query}%`, query],
    );
  }
}
