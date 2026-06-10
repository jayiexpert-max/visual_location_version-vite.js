import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity, Repository } from 'typeorm';
import { Level } from '../../../entities/level.entity';

@Injectable()
export class LevelRepository {
  constructor(
    @InjectRepository(Level)
    private readonly repository: Repository<Level>,
  ) {}

  findAll(): Promise<Level[]> {
    return this.repository.find({ order: { rackId: 'ASC', levelNo: 'ASC' } });
  }

  findById(id: number): Promise<Level | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByRackId(rackId: number): Promise<Level[]> {
    return this.repository.find({
      where: { rackId },
      order: { levelNo: 'ASC' },
    });
  }

  create(data: Partial<Level>): Promise<Level> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number, data: Partial<Level>): Promise<Level | null> {
    await this.repository.update(id, data as QueryDeepPartialEntity<Level>);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
