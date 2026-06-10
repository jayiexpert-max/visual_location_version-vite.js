import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity, Repository } from 'typeorm';
import { Rack } from '../../../entities/rack.entity';

@Injectable()
export class RackRepository {
  constructor(
    @InjectRepository(Rack)
    private readonly repository: Repository<Rack>,
  ) {}

  findAll(): Promise<Rack[]> {
    return this.repository.find({ order: { id: 'ASC' } });
  }

  findById(id: number): Promise<Rack | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByIdWithLevels(id: number): Promise<Rack | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        levels: {
          boxes: {
            slots: {
              product: true,
            },
          },
        },
        ioDevice: true,
      },
      order: {
        levels: {
          levelNo: 'ASC',
          boxes: {
            positionInLevel: 'ASC',
            slots: {
              slotNo: 'ASC',
            },
          },
        },
      },
    });
  }

  findAllWithHierarchy(): Promise<Rack[]> {
    return this.repository.find({
      relations: {
        levels: {
          boxes: {
            slots: {
              product: true,
            },
          },
        },
      },
      order: {
        id: 'ASC',
        levels: {
          levelNo: 'ASC',
          boxes: {
            positionInLevel: 'ASC',
            slots: {
              slotNo: 'ASC',
            },
          },
        },
      },
    });
  }

  create(data: Partial<Rack>): Promise<Rack> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number, data: Partial<Rack>): Promise<Rack | null> {
    await this.repository.update(id, data as QueryDeepPartialEntity<Rack>);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
