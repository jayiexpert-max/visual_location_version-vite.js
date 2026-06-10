import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CpkTokenCache } from '../../entities/cpk-token-cache.entity';
import { CpkHttpClient } from './cpk-http.client';
import { CpkTokenRepository } from './cpk-token.repository';
import { CpkTokenService } from './cpk-token.service';
import { CpkController } from './cpk.controller';
import { CpkService } from './cpk.service';

@Module({
  imports: [TypeOrmModule.forFeature([CpkTokenCache])],
  controllers: [CpkController],
  providers: [
    CpkHttpClient,
    CpkTokenRepository,
    CpkTokenService,
    CpkService,
  ],
  exports: [CpkService, CpkTokenService, CpkHttpClient],
})
export class CpkModule {}
