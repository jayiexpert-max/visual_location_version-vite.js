import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CpkTokenCache } from '../../entities/cpk-token-cache.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CpkHttpClient } from './cpk-http.client';
import { CpkTokenRepository } from './cpk-token.repository';
import { CpkTokenService } from './cpk-token.service';
import { CpkController } from './cpk.controller';
import { CpkService } from './cpk.service';
import { PicklistIssueService } from './picklist-issue.service';
import { BookingOutPreviewService } from './booking-out-preview.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CpkTokenCache]),
    forwardRef(() => InventoryModule),
    RealtimeModule,
  ],
  controllers: [CpkController],
  providers: [
    CpkHttpClient,
    CpkTokenRepository,
    CpkTokenService,
    CpkService,
    PicklistIssueService,
    BookingOutPreviewService,
  ],
  exports: [CpkService, CpkTokenService, CpkHttpClient],
})
export class CpkModule {}
