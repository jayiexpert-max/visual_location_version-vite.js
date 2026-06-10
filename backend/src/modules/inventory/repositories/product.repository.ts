import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Product } from '../../../entities/product.entity';

@Injectable()
export class InventoryProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  findBySlotId(slotId: number): Promise<Product | null> {
    return this.repository.findOne({ where: { slotId } });
  }

  findByName(name: string): Promise<Product[]> {
    return this.repository.find({ where: { name } });
  }

  create(data: Partial<Product>, manager?: EntityManager): Promise<Product> {
    const repo = manager ? manager.getRepository(Product) : this.repository;
    const entity = repo.create(data);
    return repo.save(entity);
  }

  async updateQty(
    id: number,
    qty: number,
    manager?: EntityManager,
  ): Promise<Product | null> {
    const repo = manager ? manager.getRepository(Product) : this.repository;
    await repo.update(id, { qty });
    return repo.findOne({ where: { id } });
  }

  getRepository(): Repository<Product> {
    return this.repository;
  }
}
