import { Module } from '@nestjs/common';
import { PdserviceClient } from './pdservice.client';
import { PdserviceService } from './pdservice.service';

@Module({
  providers: [PdserviceClient, PdserviceService],
  exports: [PdserviceService, PdserviceClient],
})
export class PdserviceModule {}
