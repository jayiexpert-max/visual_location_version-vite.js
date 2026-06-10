import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity, Repository } from 'typeorm';
import { Slot } from '../../../entities/slot.entity';

@Injectable()
export class SlotRepository {
  constructor(
    @InjectRepository(Slot)
    private readonly repository: Repository<Slot>,
  ) {}

  findAll(): Promise<Slot[]> {
    return this.repository.find({ order: { boxId: 'ASC', slotNo: 'ASC' } });
  }

  findById(id: number): Promise<Slot | null> {
    return this.repository.findOne({
      where: { id },
      relations: { product: true, box: true },
    });
  }

  findByBoxId(boxId: number): Promise<Slot[]> {
    return this.repository.find({
      where: { boxId },
      relations: { product: true },
      order: { slotNo: 'ASC' },
    });
  }

  create(data: Partial<Slot>): Promise<Slot> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number, data: Partial<Slot>): Promise<Slot | null> {
    await this.repository.update(id, data as QueryDeepPartialEntity<Slot>);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
