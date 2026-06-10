import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLog } from '../../entities/stock-log.entity';
import { InventoryReceive } from '../../entities/inventory-receive.entity';
import type { StockMovementsFilterDto } from './dto/stock-movements-filter.dto';
import type { ExpirationReportFilterDto } from './dto/expiration-report-filter.dto';
import type { InventoryReceiveFilterDto } from './dto/inventory-receive-filter.dto';
import { getPaginationSkip } from '../../common/dto/pagination.dto';

export interface StockMovementRow {
  id: number;
  productId: number;
  productName: string | null;
  action: string;
  actionType: string;
  quantity: number;
  userId: number;
  username: string | null;
  createdAt: Date;
}

@Injectable()
export class StockLogRepository {
  constructor(
    @InjectRepository(StockLog)
    private readonly stockLogRepository: Repository<StockLog>,
    @InjectRepository(InventoryReceive)
    private readonly inventoryReceiveRepository: Repository<InventoryReceive>,
  ) {}

  async countStockMovements(filters: StockMovementsFilterDto): Promise<number> {
    const qb = this.buildStockMovementsQuery(filters);
    return qb.getCount();
  }

  async findStockMovements(
    filters: StockMovementsFilterDto,
  ): Promise<StockMovementRow[]> {
    const skip = getPaginationSkip(filters);
    const qb = this.buildStockMovementsQuery(filters);

    const rows = await qb
      .orderBy('s.created_at', 'DESC')
      .offset(skip)
      .limit(filters.limit)
      .getRawMany<{
        id: number;
        product_id: number;
        product_name: string | null;
        action: string;
        quantity: number;
        user_id: number;
        username: string | null;
        created_at: Date;
      }>();

    return rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      action: row.action,
      actionType: row.action.split('|')[0] ?? row.action,
      quantity: row.quantity,
      userId: row.user_id,
      username: row.username,
      createdAt: row.created_at,
    }));
  }

  async countExpirationReport(
    filters: ExpirationReportFilterDto,
  ): Promise<number> {
    const qb = this.buildExpirationQuery(filters);
    return qb.getCount();
  }

  async findExpirationReport(
    filters: ExpirationReportFilterDto,
  ): Promise<InventoryReceive[]> {
    const skip = getPaginationSkip(filters);
    const qb = this.buildExpirationQuery(filters);

    return qb
      .orderBy('ir.ExpirationDate', 'ASC')
      .offset(skip)
      .limit(filters.limit)
      .getMany();
  }

  async countInventoryReceive(
    filters: InventoryReceiveFilterDto,
  ): Promise<number> {
    const qb = this.buildInventoryReceiveQuery(filters);
    return qb.getCount();
  }

  async findInventoryReceive(
    filters: InventoryReceiveFilterDto,
  ): Promise<InventoryReceive[]> {
    const skip = getPaginationSkip(filters);
    const qb = this.buildInventoryReceiveQuery(filters);

    return qb
      .orderBy('ir.ReceiveDate', 'DESC')
      .offset(skip)
      .limit(filters.limit)
      .getMany();
  }

  private buildStockMovementsQuery(filters: StockMovementsFilterDto) {
    const qb = this.stockLogRepository
      .createQueryBuilder('s')
      .leftJoin('s.product', 'p')
      .leftJoin('s.user', 'u')
      .select([
        's.id AS id',
        's.product_id AS product_id',
        'p.name AS product_name',
        's.action AS action',
        's.quantity AS quantity',
        's.user_id AS user_id',
        'u.username AS username',
        's.created_at AS created_at',
      ]);

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        '(p.name LIKE :term OR u.username LIKE :term OR s.action LIKE :term)',
        { term },
      );
    }

    if (filters.actionFilter) {
      qb.andWhere('s.action LIKE :actionPrefix', {
        actionPrefix: `${filters.actionFilter}%`,
      });
    }

    return qb;
  }

  private buildExpirationQuery(filters: ExpirationReportFilterDto) {
    const qb = this.inventoryReceiveRepository
      .createQueryBuilder('ir')
      .where('ir.QtyRemain > 0');

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        '(ir.HanaPart LIKE :term OR ir.IM LIKE :term OR ir.PUID LIKE :term)',
        { term },
      );
    }

    const status = filters.status ?? 'all';

    if (status === 'expired') {
      qb.andWhere('ir.ExpirationDate < CURDATE()');
    } else if (status === 'soon') {
      qb.andWhere(
        'ir.ExpirationDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)',
      );
    } else if (status === 'normal') {
      qb.andWhere('ir.ExpirationDate > DATE_ADD(CURDATE(), INTERVAL 7 DAY)');
    } else if (status === 'all') {
      qb.andWhere(
        'ir.ExpirationDate <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)',
      );
    }

    return qb;
  }

  private buildInventoryReceiveQuery(filters: InventoryReceiveFilterDto) {
    const qb = this.inventoryReceiveRepository.createQueryBuilder('ir');

    if (filters.puid?.trim()) {
      qb.andWhere('ir.PUID LIKE :puid', {
        puid: `%${filters.puid.trim()}%`,
      });
    }

    if (filters.im?.trim()) {
      qb.andWhere('ir.IM LIKE :im', { im: `%${filters.im.trim()}%` });
    }

    if (filters.hanaPart?.trim()) {
      qb.andWhere('ir.HanaPart LIKE :hanaPart', {
        hanaPart: `%${filters.hanaPart.trim()}%`,
      });
    }

    if (filters.dateCode?.trim()) {
      qb.andWhere('ir.DateCode LIKE :dateCode', {
        dateCode: `%${filters.dateCode.trim()}%`,
      });
    }

    if (filters.expDate) {
      qb.andWhere('DATE(ir.ExpirationDate) = :expDate', {
        expDate: filters.expDate,
      });
    }

    return qb;
  }
}
