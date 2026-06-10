import { Injectable } from '@nestjs/common';
import {
  buildPaginatedResult,
  PaginatedResult,
} from '../../common/dto/pagination.dto';
import { StockLogRepository } from './stock-log.repository';
import type { StockMovementsFilterDto } from './dto/stock-movements-filter.dto';
import type {
  ExpirationReportFilterDto,
  ExpirationReportItemDto,
} from './dto/expiration-report-filter.dto';
import type { InventoryReceiveFilterDto } from './dto/inventory-receive-filter.dto';
import type { StockMovementItemDto } from './dto/stock-movements-filter.dto';
import { InventoryReceive } from '../../entities/inventory-receive.entity';

@Injectable()
export class ReportsService {
  constructor(private readonly stockLogRepository: StockLogRepository) {}

  async stockMovements(
    filters: StockMovementsFilterDto,
  ): Promise<PaginatedResult<StockMovementItemDto>> {
    const [items, total] = await Promise.all([
      this.stockLogRepository.findStockMovements(filters),
      this.stockLogRepository.countStockMovements(filters),
    ]);

    return buildPaginatedResult(items, total, filters);
  }

  async expirationReport(
    filters: ExpirationReportFilterDto,
  ): Promise<PaginatedResult<ExpirationReportItemDto>> {
    const [rows, total] = await Promise.all([
      this.stockLogRepository.findExpirationReport(filters),
      this.stockLogRepository.countExpirationReport(filters),
    ]);

    const items = rows.map((row) => this.mapExpirationItem(row));
    return buildPaginatedResult(items, total, filters);
  }

  async inventoryReceiveList(
    filters: InventoryReceiveFilterDto,
  ): Promise<PaginatedResult<InventoryReceive>> {
    const [items, total] = await Promise.all([
      this.stockLogRepository.findInventoryReceive(filters),
      this.stockLogRepository.countInventoryReceive(filters),
    ]);

    return buildPaginatedResult(items, total, filters);
  }

  private mapExpirationItem(row: InventoryReceive): ExpirationReportItemDto {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expDate = row.expirationDate ? new Date(row.expirationDate) : null;
    let daysLeft = 0;
    let statusText = 'Normal';

    if (expDate) {
      expDate.setHours(0, 0, 0, 0);
      daysLeft = Math.round(
        (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysLeft < 0) {
        statusText = 'Expired';
      } else if (daysLeft <= 7) {
        statusText = 'Expiring Soon';
      }
    }

    return {
      id: row.id,
      hanaPart: row.hanaPart,
      im: row.im,
      puid: row.puid,
      qtyRemain: row.qtyRemain,
      expirationDate: row.expirationDate,
      locShelf: row.locShelf,
      locLevel: row.locLevel,
      locBox: row.locBox,
      statusText,
      daysLeft,
    };
  }
}
