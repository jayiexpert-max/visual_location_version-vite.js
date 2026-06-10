import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { TvHighlight } from '../../entities/tv-highlight.entity';

@Injectable()
export class TvHighlightRepository {
  constructor(
    @InjectRepository(TvHighlight)
    private readonly repository: Repository<TvHighlight>,
  ) {}

  async deleteAll(): Promise<void> {
    await this.repository.clear();
  }

  async deleteExpired(): Promise<void> {
    await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async findActive(): Promise<TvHighlight | null> {
    await this.deleteExpired();

    return this.repository
      .createQueryBuilder('h')
      .where('h.expires_at > :now', { now: new Date() })
      .orderBy('h.created_at', 'DESC')
      .getOne();
  }

  async saveHighlight(data: Partial<TvHighlight>): Promise<TvHighlight> {
    await this.deleteAll();
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
