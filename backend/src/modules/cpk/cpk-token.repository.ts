import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CpkTokenCache } from '../../entities/cpk-token-cache.entity';

const CACHE_ROW_ID = 1;

@Injectable()
export class CpkTokenRepository {
  constructor(
    @InjectRepository(CpkTokenCache)
    private readonly repository: Repository<CpkTokenCache>,
  ) {}

  async findCached(): Promise<CpkTokenCache | null> {
    return this.repository.findOne({ where: { id: CACHE_ROW_ID } });
  }

  async saveToken(publicUid: string, expiredAt: Date): Promise<CpkTokenCache> {
    const existing = await this.findCached();

    if (existing) {
      existing.publicUid = publicUid;
      existing.expiredAt = expiredAt;
      return this.repository.save(existing);
    }

    return this.repository.save(
      this.repository.create({
        id: CACHE_ROW_ID,
        publicUid,
        expiredAt,
      }),
    );
  }

  async clear(): Promise<void> {
    await this.repository.delete({ id: CACHE_ROW_ID });
  }
}
