import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryReceive } from '../../../entities/inventory-receive.entity';

@Injectable()
export class InventoryReceiveRepository {
  constructor(
    @InjectRepository(InventoryReceive)
    private readonly repository: Repository<InventoryReceive>,
  ) {}

  findByPuid(puid: string): Promise<InventoryReceive | null> {
    return this.repository.findOne({ where: { puid } });
  }

  searchByHanaPart(hanaPart: string, limit = 50): Promise<InventoryReceive[]> {
    return this.repository
      .createQueryBuilder('ir')
      .where('ir.HanaPart LIKE :hanaPart', { hanaPart: `%${hanaPart}%` })
      .orderBy('ir.ExpirationDate', 'ASC')
      .addOrderBy('ir.id', 'ASC')
      .take(limit)
      .getMany();
  }

  searchByPuid(puid: string, limit = 50): Promise<InventoryReceive[]> {
    return this.repository
      .createQueryBuilder('ir')
      .where('ir.PUID LIKE :puid', { puid: `%${puid}%` })
      .orderBy('ir.id', 'DESC')
      .take(limit)
      .getMany();
  }

  findFifoByHanaPart(hanaPart: string, limit: number): Promise<InventoryReceive[]> {
    return this.repository
      .createQueryBuilder('ir')
      .where('ir.HanaPart = :hanaPart', { hanaPart })
      .andWhere('ir.QtyRemain > 0')
      .andWhere("ir.StatusName NOT IN ('Withdrawn', 'Empty', 'Is empty')")
      .orderBy('CASE WHEN ir.ExpirationDate IS NULL THEN 1 ELSE 0 END', 'ASC')
      .addOrderBy('ir.ExpirationDate', 'ASC')
      .addOrderBy('ir.id', 'ASC')
      .take(limit)
      .getMany();
  }

  create(data: Partial<InventoryReceive>): Promise<InventoryReceive> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(
    id: number,
    data: Partial<InventoryReceive>,
  ): Promise<InventoryReceive | null> {
    await this.repository.update(id, data);
    return this.repository.findOne({ where: { id } });
  }

  getRepository(): Repository<InventoryReceive> {
    return this.repository;
  }
}
