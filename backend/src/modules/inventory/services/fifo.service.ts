import { Injectable } from '@nestjs/common';
import { InventoryReceive } from '../../../entities/inventory-receive.entity';
import { InventoryReceiveRepository } from '../repositories/inventory-receive.repository';

@Injectable()
export class FifoService {
  constructor(
    private readonly inventoryReceiveRepository: InventoryReceiveRepository,
  ) {}

  getFifoList(hanaPart: string, limit = 20): Promise<InventoryReceive[]> {
    return this.inventoryReceiveRepository.findFifoByHanaPart(hanaPart, limit);
  }
}
