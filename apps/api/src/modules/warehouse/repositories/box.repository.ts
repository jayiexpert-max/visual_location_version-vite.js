import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity, Repository } from 'typeorm';
import { Box } from '../../../entities/box.entity';

@Injectable()
export class BoxRepository {
  constructor(
    @InjectRepository(Box)
    private readonly repository: Repository<Box>,
  ) {}

  findAll(): Promise<Box[]> {
    return this.repository.find({ order: { levelId: 'ASC', positionInLevel: 'ASC' } });
  }

  findById(id: number): Promise<Box | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByIdWithSlots(id: number): Promise<Box | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        slots: {
          product: true,
        },
        level: {
          rack: true,
        },
        ioDevice: true,
      },
      order: {
        slots: {
          slotNo: 'ASC',
        },
      },
    });
  }

  findByLevelId(levelId: number): Promise<Box[]> {
    return this.repository.find({
      where: { levelId },
      order: { positionInLevel: 'ASC' },
    });
  }

  create(data: Partial<Box>): Promise<Box> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number, data: Partial<Box>): Promise<Box | null> {
    await this.repository.update(id, data as QueryDeepPartialEntity<Box>);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
