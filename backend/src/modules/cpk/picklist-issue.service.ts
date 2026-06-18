import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { InventoryReceive } from '../../entities/inventory-receive.entity';
import { Product } from '../../entities/product.entity';
import { CpkService } from './cpk.service';
import type { CpkResponseBody } from './interfaces/cpk.types';
import { FifoService } from '../inventory/services/fifo.service';
import { InventoryReceiveRepository } from '../inventory/repositories/inventory-receive.repository';
import { InventoryProductRepository } from '../inventory/repositories/product.repository';
import { StockLogRepository } from '../inventory/repositories/stock-log.repository';
import { HighlightGateway } from '../realtime/highlight.gateway';

export interface PicklistIssueResult extends CpkResponseBody {
  ReportLogged?: boolean;
  LocalWithdrawn?: boolean;
  LocalWithdrawMessage?: string;
  fifo?: Record<string, unknown>;
  fifo_renewal_notice?: boolean;
}

@Injectable()
export class PicklistIssueService {
  private readonly logger = new Logger(PicklistIssueService.name);

  constructor(
    private readonly cpkService: CpkService,
    private readonly fifoService: FifoService,
    private readonly inventoryReceiveRepository: InventoryReceiveRepository,
    private readonly productRepository: InventoryProductRepository,
    private readonly stockLogRepository: StockLogRepository,
    private readonly dataSource: DataSource,
    private readonly highlightGateway: HighlightGateway,
  ) {}

  async issuePuid(
    picklistId: string,
    puid: string,
    operator: string,
    user: AuthenticatedUser,
  ): Promise<PicklistIssueResult> {
    const normalized = this.fifoService.normalizePuid(puid);
    if (!picklistId.trim() || !normalized) {
      throw new BadRequestException('PicklistID and PUID are required');
    }
    if (!operator.trim()) {
      throw new BadRequestException('Operator is required');
    }

    const fifoCheck = await this.fifoService.validateForPicklistIssue(normalized);
    if (!fifoCheck.ok) {
      throw new BadRequestException({
        message: fifoCheck.message,
        code: 'PICKLIST_FIFO_FAILED',
        details: {
          recommended_puid: fifoCheck.recommended_puid,
          expired_rolls: fifoCheck.expired_rolls,
          renewal_required: fifoCheck.renewal_required ?? false,
        },
      });
    }

    const cpkResult = await this.cpkService.issuePuidToPicklistRaw({
      picklistId: picklistId.trim(),
      puid: normalized,
      operator: operator.trim(),
    });

    const response: PicklistIssueResult = { ...cpkResult };

    if (fifoCheck.expired_rolls?.length || fifoCheck.renewal_notice) {
      response.fifo = {
        expired_rolls: fifoCheck.expired_rolls ?? [],
        recommended_puid: fifoCheck.recommended_puid,
        renewal_required: fifoCheck.renewal_required ?? false,
      };
      if (fifoCheck.renewal_notice) {
        response.fifo_renewal_notice = true;
      }
    }

    const puidInfo = (cpkResult.PUIDInfo ?? cpkResult.puidInfo) as
      | Record<string, unknown>
      | undefined;

    try {
      response.ReportLogged = await this.logPicklistIssue(
        picklistId.trim(),
        normalized,
        user.id,
        puidInfo,
        operator.trim(),
      );
    } catch (err) {
      this.logger.warn(
        `picklist stock log failed: ${err instanceof Error ? err.message : err}`,
      );
      response.ReportLogged = false;
    }

    const withdraw = await this.withdrawPuidLocal(normalized);
    response.LocalWithdrawn = withdraw.ok;
    if (!withdraw.ok && withdraw.message) {
      response.LocalWithdrawMessage = withdraw.message;
    }

    this.highlightGateway.emitPicklistUpdate({
      picklistId: picklistId.trim(),
      puid: normalized,
      action: 'issue',
      operator: operator.trim(),
      timestamp: new Date().toISOString(),
    });

    return response;
  }

  private async logPicklistIssue(
    picklistId: string,
    puid: string,
    userId: number,
    puidInfo: Record<string, unknown> | undefined,
    operator: string,
  ): Promise<boolean> {
    if (userId <= 0) return false;

    let hanaPart = String(puidInfo?.PartNumber ?? puidInfo?.HanaPart ?? '').trim();
    let qty = parseInt(String(puidInfo?.Quantity ?? 0), 10) || 0;

    const local = await this.inventoryReceiveRepository.findByPuidCandidates([
      puid,
      `VL${puid}`,
    ]);

    if (local) {
      if (!hanaPart) hanaPart = local.hanaPart?.trim() ?? '';
      if (qty <= 0) qty = Number(local.qtyRemain ?? local.qty ?? 0);
    }

    if (!hanaPart) return false;

    const products = await this.productRepository.findByName(hanaPart);
    const product = products[0];
    if (!product) return false;

    const safePuid = puid.replace(/\|/g, '-');
    const safePicklist = picklistId.replace(/\|/g, '-');
    const remark = `[Picklist: ${safePicklist}]${operator ? ` Operator: ${operator.replace(/\|/g, '-')}` : ''}`;

    await this.stockLogRepository.create({
      productId: product.id,
      userId,
      action: `picklist_issue|${Math.max(0, qty)}|${safePuid}`,
      quantity: 1,
      remark,
    });

    return true;
  }

  private async withdrawPuidLocal(puid: string): Promise<{
    ok: boolean;
    message?: string;
  }> {
    const row = await this.inventoryReceiveRepository
      .getRepository()
      .createQueryBuilder('ir')
      .where('UPPER(ir.PUID) IN (:...puids)', {
        puids: [puid.toUpperCase(), `VL${puid.toUpperCase()}`],
      })
      .andWhere('ir.qtyRemain > 0')
      .andWhere("ir.statusName NOT IN ('Withdrawn', 'Empty')")
      .orderBy('ir.id', 'DESC')
      .getOne();

    if (!row) {
      return { ok: false, message: 'PUID not found in local stock or already withdrawn' };
    }

    const hanaPart = row.hanaPart?.trim() ?? '';
    if (!hanaPart) {
      return { ok: false, message: 'HanaPart missing for PUID' };
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(InventoryReceive).update(row.id, {
        qtyRemain: 0,
        statusName: 'Withdrawn',
      });

      const product = await manager
        .getRepository(Product)
        .createQueryBuilder('p')
        .where('p.name = :name', { name: hanaPart })
        .orderBy('p.id', 'DESC')
        .getOne();

      if (product) {
        await manager.getRepository(Product).update(product.id, {
          qty: Math.max(0, Number(product.qty ?? 0) - 1),
        });
      }
    });

    return { ok: true };
  }
}
