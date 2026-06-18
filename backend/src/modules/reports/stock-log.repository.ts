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
  actionLabel: string;
  puid: string | null;
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

    return rows.map((row) => {
      const parts = row.action.split('|');
      const head = parts[0] ?? row.action;
      const puid = parts[2]?.trim() || null;
      const parsed = this.parseStockAction(row.action);
      return {
        id: row.id,
        productId: row.product_id,
        productName: row.product_name,
        action: row.action,
        actionType: parsed.kind,
        actionLabel: parsed.actionLabel,
        puid,
        quantity: row.quantity,
        userId: row.user_id,
        username: row.username,
        createdAt: row.created_at,
      };
    });
  }

  private parseStockAction(actionStr: string): { kind: string; actionLabel: string } {
    if (actionStr.includes('|')) {
      const [head, , puidPart] = actionStr.split('|');
      if (head === 'res_receive') {
        return { kind: 'res_receive', actionLabel: `RES receive${puidPart ? ` (${puidPart})` : ''}` };
      }
      if (head.startsWith('booking_out_')) {
        const dest = head.slice('booking_out_'.length).toUpperCase();
        return { kind: 'booking_out', actionLabel: `Booking Out → ${dest}` };
      }
      if (head === 'picklist_issue' || head === 'withdraw') {
        return { kind: 'picklist_issue', actionLabel: `Picklist issue${puidPart ? ` (${puidPart})` : ''}` };
      }
      if (head === 'add') {
        return { kind: 'add', actionLabel: 'Receive (Add Stock)' };
      }
    }
    if (actionStr === 'add') {
      return { kind: 'add', actionLabel: 'Receive (Add Stock)' };
    }
    if (actionStr.startsWith('booking_out')) {
      return { kind: 'booking_out', actionLabel: 'Booking Out' };
    }
    return { kind: actionStr, actionLabel: actionStr };
  }

  async countExpirationReport(
    filters: ExpirationReportFilterDto,
  ): Promise<number> {
    const qb = this.buildExpirationQuery(filters);
    qb.select('1').groupBy('ir.HanaPart').addGroupBy('ir.IM');
    const raw = await qb.getRawMany();
    return raw.length;
  }

  async findExpirationReport(
    filters: ExpirationReportFilterDto,
  ): Promise<any[]> {
    const skip = getPaginationSkip(filters);
    const qb = this.buildExpirationQuery(filters);

    qb.select([
      'ir.HanaPart AS hanaPart',
      'ir.IM AS im',
      'COUNT(*) AS puidCount',
      'SUM(ir.QtyRemain) AS totalQty',
      'MIN(ir.ExpirationDate) AS expirationDate',
      "GROUP_CONCAT(DISTINCT NULLIF(TRIM(ir.LotNo), '') ORDER BY ir.LotNo SEPARATOR ', ') AS lotsRaw"
    ])
    .groupBy('ir.HanaPart')
    .addGroupBy('ir.IM')
    .orderBy('MIN(ir.ExpirationDate)', 'ASC')
    .offset(skip)
    .limit(filters.limit);

    return qb.getRawMany();
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

    if (filters.actionFilter === 'add') {
      qb.andWhere(
        "(s.action LIKE 'add%' OR s.action = 'add') AND (s.remark IS NULL OR s.remark = '' OR s.remark NOT LIKE '%RES%')",
      );
    } else if (filters.actionFilter === 'res_receive') {
      qb.andWhere("s.action LIKE 'res_receive%'");
    } else if (filters.actionFilter === 'picklist_issue' || filters.actionFilter === 'withdraw') {
      qb.andWhere("(s.action LIKE 'picklist_issue%' OR s.action LIKE 'withdraw%')");
    } else if (filters.actionFilter === 'booking_out') {
      qb.andWhere("s.action LIKE 'booking_out%'");
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

    const resNo = filters.resNo?.trim().replace(/^RES/i, '');
    if (resNo) {
      qb.andWhere('ir.ReservationNo = :resNo', { resNo });
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
