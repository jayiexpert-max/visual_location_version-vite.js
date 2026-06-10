import { Module } from '@nestjs/common';
import { CpkModule } from '../cpk/cpk.module';
import { IoModule } from '../io/io.module';
import { PdserviceModule } from '../pdservice/pdservice.module';
import { HealthController } from './health.controller';

@Module({
  imports: [CpkModule, PdserviceModule, IoModule],
  controllers: [HealthController],
})
export class HealthModule {}
