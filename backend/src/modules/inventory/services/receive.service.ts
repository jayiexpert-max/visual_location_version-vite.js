import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditCategory } from '../../../entities/audit-log.entity';
import { AuditService } from '../../audit/audit.service';
import { CpkService } from '../../cpk/cpk.service';
import { CpkTokenService } from '../../cpk/cpk-token.service';
import { DataSource } from 'typeorm';
import { InventoryReceive } from '../../../entities/inventory-receive.entity';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { SlotRepository } from '../../warehouse/repositories/slot.repository';
import { ReceiveItemDto } from '../dto/receive-item.dto';
import { ReceiveReturnDto } from '../dto/receive-return.dto';
import { InventoryReceiveRepository } from '../repositories/inventory-receive.repository';
import { InventoryProductRepository } from '../repositories/product.repository';
import { StockLogRepository } from '../repositories/stock-log.repository';
import { HighlightGateway } from '../../realtime/highlight.gateway';
import { InventoryService } from './inventory.service';

export interface ReceiveResult {
  inventoryReceive: InventoryReceive;
  productId: number;
  newQty: number;
}

@Injectable()
export class ReceiveService {
  private readonly logger = new Logger(ReceiveService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly inventoryReceiveRepository: InventoryReceiveRepository,
    private readonly productRepository: InventoryProductRepository,
    private readonly stockLogRepository: StockLogRepository,
    private readonly slotRepository: SlotRepository,
    private readonly inventoryService: InventoryService,
    private readonly highlightGateway: HighlightGateway,
    private readonly auditService: AuditService,
    private readonly cpkService: CpkService,
    private readonly cpkTokenService: CpkTokenService,
  ) {}

  async receiveItem(
    dto: ReceiveItemDto,
    user: AuthenticatedUser,
  ): Promise<ReceiveResult> {
    const slot = await this.slotRepository.findById(dto.slotId);

    if (!slot) {
      throw new NotFoundException({
        message: `Slot ${dto.slotId} not found`,
        code: 'WAREHOUSE_SLOT_NOT_FOUND',
      });
    }

    const existingPuid = await this.inventoryReceiveRepository.findByPuid(dto.puid);

    if (existingPuid) {
      throw new BadRequestException({
        message: `PUID ${dto.puid} already received`,
        code: 'INVENTORY_PUID_EXISTS',
      });
    }

    if (this.cpkTokenService.getMcId() && dto.reservationNo) {
      try {
        await this.cpkService.resPuidRecv({
          resNo: dto.reservationNo,
          puid: dto.puid,
          operator: user.username,
          location: [dto.locShelf, dto.locLevel, dto.locBox]
            .filter(Boolean)
            .join(' '),
        });
      } catch (error) {
        this.logger.warn(
          `CPK RES_PUIDRecv failed for ${dto.puid}: ${error instanceof Error ? error.message : error}`,
        );
        throw new BadGatewayException({
          message: 'CPK receive confirmation failed',
          code: 'CPK_RECEIVE_FAILED',
        });
      }
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const receiveRepo =
        manager.getRepository(InventoryReceive);

      const inventoryReceive = await receiveRepo.save(
        receiveRepo.create({
          receiveDate: new Date(),
          puid: dto.puid,
          reservationNo: dto.reservationNo ?? null,
          im: dto.im ?? null,
          customer: dto.customer ?? null,
          hanaPart: dto.hanaPart,
          description: dto.description ?? null,
          mnfPartNo: dto.mnfPartNo ?? null,
          lotNo: dto.lotNo ?? null,
          dateCode: dto.dateCode ?? null,
          qty: dto.qty,
          qtyRemain: dto.qty,
          statusName: dto.statusName ?? 'Available',
          expirationDate: dto.expirationDate
            ? new Date(dto.expirationDate)
            : null,
          locShelf: dto.locShelf ?? null,
          locLevel: dto.locLevel ?? null,
          locBox: dto.locBox ?? null,
          remark: dto.remark ?? null,
        }),
      );

      let product = await this.productRepository.findBySlotId(dto.slotId);

      if (product) {
        product = await this.productRepository.updateQty(
          product.id,
          product.qty + dto.qty,
          manager,
        );
      } else {
        product = await this.productRepository.create(
          {
            slotId: dto.slotId,
            name: dto.hanaPart,
            qty: dto.qty,
            remark: dto.remark ?? null,
          },
          manager,
        );
      }

      if (!product) {
        throw new BadRequestException({
          message: 'Failed to update product quantity',
          code: 'INVENTORY_PRODUCT_UPDATE_FAILED',
        });
      }

      await this.stockLogRepository.create(
        {
          productId: product.id,
          userId: user.id,
          action: `add|${dto.qty}|${dto.puid}`,
          quantity: dto.qty,
          remark: dto.remark ?? null,
        },
        manager,
      );

      return {
        inventoryReceive,
        productId: product.id,
        newQty: product.qty,
      };
    });

    this.emitInventoryChange(dto.slotId, slot.boxId ?? 0, 'receive');

    await this.auditService.log({
      action: 'receive_material',
      category: AuditCategory.Inventory,
      userId: user.id,
      username: user.username,
      resourceType: 'puid',
      resourceId: dto.puid,
      details: {
        slotId: dto.slotId,
        qty: dto.qty,
        hanaPart: dto.hanaPart,
      },
    });

    return result;
  }

  async receiveReturn(
    dto: ReceiveReturnDto,
    user: AuthenticatedUser,
  ): Promise<ReceiveResult> {
    const existing = await this.inventoryService.getByPuid(dto.puid);

    if (!existing.hanaPart) {
      throw new BadRequestException({
        message: `PUID ${dto.puid} has no associated HanaPart`,
        code: 'INVENTORY_PUID_INVALID',
      });
    }

    const slot = await this.slotRepository.findById(dto.slotId);

    if (!slot) {
      throw new NotFoundException({
        message: `Slot ${dto.slotId} not found`,
        code: 'WAREHOUSE_SLOT_NOT_FOUND',
      });
    }

    const newQtyRemain = (existing.qtyRemain ?? 0) + dto.qty;

    if (this.cpkTokenService.getMcId()) {
      try {
        await this.cpkService.updatePuidStatus({
          puid: dto.puid,
          operator: user.username,
          newQty: String(newQtyRemain),
          location: [existing.locShelf, existing.locLevel, existing.locBox]
            .filter(Boolean)
            .join(' '),
        });
      } catch (error) {
        this.logger.warn(
          `CPK UpdatePUIDStatus failed for ${dto.puid}: ${error instanceof Error ? error.message : error}`,
        );
        throw new BadGatewayException({
          message: 'CPK return confirmation failed',
          code: 'CPK_RETURN_FAILED',
        });
      }
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const receiveRepo = manager.getRepository(InventoryReceive);
      await receiveRepo.update(existing.id, {
        qtyRemain: newQtyRemain,
        statusName: 'Available',
        remark: dto.remark ?? existing.remark,
      });

      const inventoryReceive = await receiveRepo.findOne({
        where: { id: existing.id },
      });

      if (!inventoryReceive) {
        throw new BadRequestException({
          message: 'Failed to update inventory receive record',
          code: 'INVENTORY_RECEIVE_UPDATE_FAILED',
        });
      }

      let product = await this.productRepository.findBySlotId(dto.slotId);

      if (product) {
        product = await this.productRepository.updateQty(
          product.id,
          product.qty + dto.qty,
          manager,
        );
      } else {
        product = await this.productRepository.create(
          {
            slotId: dto.slotId,
            name: existing.hanaPart,
            qty: dto.qty,
            remark: dto.remark ?? null,
          },
          manager,
        );
      }

      if (!product) {
        throw new BadRequestException({
          message: 'Failed to update product quantity',
          code: 'INVENTORY_PRODUCT_UPDATE_FAILED',
        });
      }

      await this.stockLogRepository.create(
        {
          productId: product.id,
          userId: user.id,
          action: `add|${dto.qty}|${dto.puid}`,
          quantity: dto.qty,
          remark: dto.remark ?? 'receive return',
        },
        manager,
      );

      return {
        inventoryReceive,
        productId: product.id,
        newQty: product.qty,
      };
    });

    this.emitInventoryChange(dto.slotId, slot.boxId ?? 0, 'receive-return');

    await this.auditService.log({
      action: 'return_material',
      category: AuditCategory.Inventory,
      userId: user.id,
      username: user.username,
      resourceType: 'puid',
      resourceId: dto.puid,
      details: {
        slotId: dto.slotId,
        qty: dto.qty,
        newQtyRemain,
      },
    });

    return result;
  }

  private emitInventoryChange(
    slotId: number,
    boxId: number,
    action: string,
  ): void {
    this.highlightGateway.emitInventoryUpdate({
      rackId: 0,
      boxId,
      slotId,
      action,
      timestamp: new Date().toISOString(),
    });
  }
}
