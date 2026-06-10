import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import {
  RefreshToken,
  RefreshTokenDeviceType,
} from '../../../entities/refresh-token.entity';

export interface CreateRefreshTokenParams {
  userId: number;
  tokenHash: string;
  deviceType: RefreshTokenDeviceType;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repository: Repository<RefreshToken>,
  ) {}

  async createToken(params: CreateRefreshTokenParams): Promise<RefreshToken> {
    const entity = this.repository.create({
      userId: params.userId,
      tokenHash: params.tokenHash,
      deviceType: params.deviceType,
      expiresAt: params.expiresAt,
      revokedAt: null,
    });

    return this.repository.save(entity);
  }

  findValidByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repository.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await this.repository.update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.repository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
