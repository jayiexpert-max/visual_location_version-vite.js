import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity, Repository } from 'typeorm';
import { Product } from '../../../entities/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  findAll(): Promise<Product[]> {
    return this.repository.find({ order: { id: 'ASC' } });
  }

  findById(id: number): Promise<Product | null> {
    return this.repository.findOne({
      where: { id },
      relations: { slot: true },
    });
  }

  findBySlotId(slotId: number): Promise<Product | null> {
    return this.repository.findOne({ where: { slotId } });
  }

  findByName(name: string): Promise<Product[]> {
    return this.repository.find({
      where: { name },
      relations: {
        slot: {
          box: {
            level: {
              rack: true,
            },
          },
        },
      },
    });
  }

  findByBoxId(boxId: number): Promise<Product[]> {
    return this.repository
      .createQueryBuilder('product')
      .innerJoin('product.slot', 'slot')
      .where('slot.box_id = :boxId', { boxId })
      .orderBy('slot.slot_no', 'ASC')
      .getMany();
  }

  create(data: Partial<Product>): Promise<Product> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number, data: Partial<Product>): Promise<Product | null> {
    await this.repository.update(id, data as QueryDeepPartialEntity<Product>);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
