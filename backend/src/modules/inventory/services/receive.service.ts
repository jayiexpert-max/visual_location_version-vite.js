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
import { AddStockDto } from '../dto/add-stock.dto';
import { InventoryReceiveRepository } from '../repositories/inventory-receive.repository';
import { InventoryProductRepository } from '../repositories/product.repository';
import { StockLogRepository } from '../repositories/stock-log.repository';
import { HighlightGateway } from '../../realtime/highlight.gateway';
import { InventoryService } from './inventory.service';

export interface ReceiveResult {
  inventoryReceive: InventoryReceive;
  productId: number;
  newQty: number;
  alreadyReceived?: boolean;
  alreadyWithdrawn?: boolean;
  cpkWarnings?: string[];
  cpkSynced?: boolean;
  isNewReel?: boolean;
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
    const cpkWarnings: string[] = [];

    if (existingPuid) {
      const status = String(existingPuid.statusName ?? '');
      if (['Withdrawn', 'Empty', 'Is empty'].includes(status)) {
        return {
          inventoryReceive: existingPuid,
          productId: 0,
          newQty: 0,
          alreadyWithdrawn: true,
          cpkWarnings,
        };
      }

      return {
        inventoryReceive: existingPuid,
        productId: 0,
        newQty: existingPuid.qtyRemain ?? existingPuid.qty ?? 0,
        alreadyReceived: true,
        cpkWarnings,
      };
    }

    if (this.cpkTokenService.getMcId() && dto.reservationNo && !dto.skipCpk) {
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
    } else if (dto.skipCpk && dto.reservationNo) {
      cpkWarnings.push('Skipped CPK receive (already received in CPK).');
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

    if (dto.reservationNo?.trim()) {
      this.highlightGateway.emitReservationUpdate({
        resNo: dto.reservationNo.trim(),
        puid: dto.puid,
        action: 'received',
        operator: user.username,
        timestamp: new Date().toISOString(),
      });
    }

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

    return { ...result, cpkWarnings };
  }

  async addStock(dto: AddStockDto, user: AuthenticatedUser): Promise<ReceiveResult> {
    const puid = dto.puid.trim();
    const hanaPart = dto.hanaPart.trim();

    if (!dto.im?.trim()) {
      throw new BadRequestException({
        message: 'IM and PUID are required',
        code: 'INVENTORY_ADD_STOCK_INVALID',
      });
    }

    if (dto.qtyRemain <= 0) {
      throw new BadRequestException({
        message: 'Qty Remain must be greater than 0',
        code: 'INVENTORY_QTY_REMAIN_INVALID',
      });
    }

    const masterProducts = await this.productRepository.findByName(hanaPart);
    if (masterProducts.length === 0) {
      throw new BadRequestException({
        message: `Part "${hanaPart}" is not registered in the system (add via Admin first)`,
        code: 'INVENTORY_PART_NOT_REGISTERED',
      });
    }

    const slot = await this.slotRepository.findById(dto.slotId);
    if (!slot) {
      throw new NotFoundException({
        message: `Slot ${dto.slotId} not found`,
        code: 'WAREHOUSE_SLOT_NOT_FOUND',
      });
    }

    const existingPuid = await this.inventoryReceiveRepository.findByPuid(puid);
    const isNewReel =
      !existingPuid ||
      ['Withdrawn', 'Empty', 'Is empty'].includes(
        String(existingPuid.statusName ?? ''),
      );

    const cpkWarnings: string[] = [];
    let cpkSynced = false;
    let qtyRemain = dto.qtyRemain;

    const mcId = this.cpkTokenService.getMcId();
    if (!mcId) {
      cpkWarnings.push(
        'CPK McID not configured — saved to local warehouse only.',
      );
    } else {
      const location = [
        dto.locShelf,
        dto.locLevel,
        dto.locBox,
        dto.locSlot !== undefined ? String(dto.locSlot) : '',
      ]
        .filter(Boolean)
        .join(' ');

      try {
        await this.cpkService.updatePuidStatus({
          puid,
          operator: user.username,
          newQty: String(qtyRemain),
          location: location || undefined,
        });
        cpkSynced = true;
      } catch (error) {
        this.logger.warn(
          `CPK UpdatePUIDStatus failed for ${puid}: ${error instanceof Error ? error.message : error}`,
        );
        if (error instanceof BadGatewayException) {
          cpkWarnings.push(
            'CPK unreachable — local save only; sync UpdatePUIDStatus when CPK is back.',
          );
        } else {
          throw error;
        }
      }
    }

    const receiveDate = dto.receiveDate ? new Date(dto.receiveDate) : new Date();
    const expirationDate = dto.expirationDate
      ? new Date(dto.expirationDate)
      : null;
    const expireDateRoomTemp = dto.expireDateRoomTemp
      ? new Date(dto.expireDateRoomTemp)
      : null;

    const result = await this.dataSource.transaction(async (manager) => {
      const receiveRepo = manager.getRepository(InventoryReceive);

      const receivePayload: Partial<InventoryReceive> = {
        receiveDate,
        puid,
        reservationNo: dto.reservationNo?.trim() || null,
        im: dto.im.trim(),
        customer: dto.customer ?? null,
        hanaPart,
        description: dto.description ?? null,
        mnfPartNo: dto.mnfPartNo ?? null,
        lotNo: dto.lotNo ?? null,
        dateCode: dto.dateCode ?? null,
        binSize: dto.binSize ?? null,
        qty: dto.qty,
        qtyRemain,
        mcId: dto.mcId ?? null,
        machineName: dto.machineName ?? null,
        statusName: dto.statusName ?? 'Available',
        expirationDate,
        oldIm: dto.oldIm ?? null,
        remark: dto.remark ?? null,
        locShelf: dto.locShelf ?? null,
        locLevel: dto.locLevel ?? null,
        locBox: dto.locBox ?? null,
        expireDateRoomTemp,
      };

      let inventoryReceive: InventoryReceive | null;

      if (existingPuid) {
        await receiveRepo.update(existingPuid.id, receivePayload);
        inventoryReceive = await receiveRepo.findOne({
          where: { id: existingPuid.id },
        });
      } else {
        inventoryReceive = await receiveRepo.save(
          receiveRepo.create(receivePayload),
        );
      }

      if (!inventoryReceive) {
        throw new BadRequestException({
          message: 'Failed to save inventory receive record',
          code: 'INVENTORY_RECEIVE_SAVE_FAILED',
        });
      }

      let productId = 0;
      let newQty = 0;

      if (isNewReel) {
        let product = await this.productRepository.findBySlotIdAndName(
          dto.slotId,
          hanaPart,
        );

        if (product) {
          product = await this.productRepository.updateQty(
            product.id,
            product.qty + 1,
            manager,
          );
        } else {
          product = await this.productRepository.create(
            {
              slotId: dto.slotId,
              name: hanaPart,
              qty: 1,
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

        productId = product.id;
        newQty = product.qty;

        const safePuid = puid.replace(/\|/g, '-');
        const resNo = dto.reservationNo?.trim() ?? '';
        const logAction = resNo
          ? `res_receive|${qtyRemain}|${safePuid}`
          : `add|${qtyRemain}|${safePuid}`;

        await this.stockLogRepository.create(
          {
            productId: product.id,
            userId: user.id,
            action: logAction,
            quantity: 1,
            remark: resNo ? `[RES: ${resNo.replace(/\|/g, '-')}]` : null,
          },
          manager,
        );
      }

      return {
        inventoryReceive,
        productId,
        newQty,
      };
    });

    this.emitInventoryChange(dto.slotId, slot.boxId ?? 0, 'add-stock');

    await this.auditService.log({
      action: 'add_stock',
      category: AuditCategory.Inventory,
      userId: user.id,
      username: user.username,
      resourceType: 'puid',
      resourceId: puid,
      details: {
        slotId: dto.slotId,
        qtyRemain,
        hanaPart,
        isNewReel,
        cpkSynced,
      },
    });

    return { ...result, cpkWarnings, cpkSynced, isNewReel };
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
