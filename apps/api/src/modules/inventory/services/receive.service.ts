import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InventoryReceive } from '../../../entities/inventory-receive.entity';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { SlotRepository } from '../../warehouse/repositories/slot.repository';
import { ReceiveItemDto } from '../dto/receive-item.dto';
import { ReceiveReturnDto } from '../dto/receive-return.dto';
import { InventoryReceiveRepository } from '../repositories/inventory-receive.repository';
import { InventoryProductRepository } from '../repositories/product.repository';
import { StockLogRepository } from '../repositories/stock-log.repository';
import { InventoryService } from './inventory.service';

export interface ReceiveResult {
  inventoryReceive: InventoryReceive;
  productId: number;
  newQty: number;
}

@Injectable()
export class ReceiveService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly inventoryReceiveRepository: InventoryReceiveRepository,
    private readonly productRepository: InventoryProductRepository,
    private readonly stockLogRepository: StockLogRepository,
    private readonly slotRepository: SlotRepository,
    private readonly inventoryService: InventoryService,
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

    // CPK RES_PUIDRecv integration deferred to Phase 2 CpkModule wiring.
    return this.dataSource.transaction(async (manager) => {
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

    // CPK UpdatePUIDStatus integration deferred to Phase 2 CpkModule wiring.
    return this.dataSource.transaction(async (manager) => {
      const receiveRepo = manager.getRepository(InventoryReceive);
      const newQtyRemain = (existing.qtyRemain ?? 0) + dto.qty;

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
  }
}
