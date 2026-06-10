import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { StockLog } from '../../../entities/stock-log.entity';

@Injectable()
export class StockLogRepository {
  constructor(
    @InjectRepository(StockLog)
    private readonly repository: Repository<StockLog>,
  ) {}

  create(
    data: Partial<StockLog>,
    manager?: EntityManager,
  ): Promise<StockLog> {
    const repo = manager ? manager.getRepository(StockLog) : this.repository;
    const entity = repo.create(data);
    return repo.save(entity);
  }
}
