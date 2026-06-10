import { Module } from '@nestjs/common';
import { CpkModule } from '../cpk/cpk.module';
import { IoModule } from '../io/io.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { PdserviceModule } from '../pdservice/pdservice.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { DatabaseHealthService } from './database-health.service';
import { HealthController } from './health.controller';
import { SystemMetricsService } from './system-metrics.service';

@Module({
  imports: [CpkModule, PdserviceModule, MqttModule, IoModule, RealtimeModule],
  controllers: [HealthController],
  providers: [DatabaseHealthService, SystemMetricsService],
  exports: [DatabaseHealthService, SystemMetricsService],
})
export class HealthModule {}
