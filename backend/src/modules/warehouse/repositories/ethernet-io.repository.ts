import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity, Repository } from 'typeorm';
import { EthernetIo } from '../../../entities/ethernet-io.entity';

@Injectable()
export class EthernetIoRepository {
  constructor(
    @InjectRepository(EthernetIo)
    private readonly repository: Repository<EthernetIo>,
  ) {}

  findAll(): Promise<EthernetIo[]> {
    return this.repository.find({ order: { id: 'ASC' } });
  }

  findById(id: number): Promise<EthernetIo | null> {
    return this.repository.findOne({ where: { id } });
  }

  create(data: Partial<EthernetIo>): Promise<EthernetIo> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number, data: Partial<EthernetIo>): Promise<EthernetIo | null> {
    await this.repository.update(id, data as QueryDeepPartialEntity<EthernetIo>);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
