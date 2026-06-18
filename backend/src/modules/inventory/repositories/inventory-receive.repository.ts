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

  findByPuidCandidates(candidates: string[]): Promise<InventoryReceive | null> {
    const upper = [...new Set(candidates.map((c) => c.trim().toUpperCase()).filter(Boolean))];
    if (upper.length === 0) return Promise.resolve(null);

    return this.repository
      .createQueryBuilder('ir')
      .where('UPPER(ir.PUID) IN (:...upper)', { upper })
      .orderBy('ir.id', 'DESC')
      .getOne();
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

  findFifoByHanaPart(
    hanaPart: string,
    limit: number,
    options: { dummyImMarker?: string; nearExpiryDays?: number } = {},
  ): Promise<InventoryReceive[]> {
    const nearDays = options.nearExpiryDays ?? 30;
    const qb = this.repository
      .createQueryBuilder('ir')
      .where('ir.HanaPart = :hanaPart', { hanaPart })
      .andWhere('ir.QtyRemain > 0')
      .andWhere("ir.StatusName NOT IN ('Withdrawn', 'Empty', 'Is empty')")
      .andWhere(
        `(ir.ExpirationDate IS NULL OR ir.ExpirationDate = '' OR DATE(ir.ExpirationDate) >= CURDATE())`,
      );

    const marker = options.dummyImMarker?.trim();
    if (marker) {
      qb.andWhere(
        `(ir.IM IS NULL OR ir.IM = '' OR UPPER(ir.IM) NOT LIKE :dummyPattern)`,
        { dummyPattern: `%${marker.toUpperCase()}%` },
      );
    }

    qb.orderBy(
      `CASE
        WHEN ir.ExpirationDate IS NOT NULL
          AND ir.ExpirationDate != ''
          AND DATE(ir.ExpirationDate) >= CURDATE()
          AND DATE(ir.ExpirationDate) <= DATE_ADD(CURDATE(), INTERVAL ${nearDays} DAY)
        THEN 0
        WHEN ir.ExpirationDate IS NULL OR ir.ExpirationDate = '' THEN 2
        ELSE 1
      END`,
      'ASC',
    )
      .addOrderBy('ir.ExpirationDate', 'ASC')
      .addOrderBy(`CASE WHEN ir.IM IS NULL OR ir.IM = '' THEN 1 ELSE 0 END`, 'ASC')
      .addOrderBy('ir.IM', 'ASC')
      .addOrderBy('ir.id', 'ASC')
      .take(limit);

    return qb.getMany();
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
