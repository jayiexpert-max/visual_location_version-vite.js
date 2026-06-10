import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Box } from '../../entities/box.entity';
import { Rack } from '../../entities/rack.entity';
import { EthernetIo } from '../../entities/ethernet-io.entity';
import { IoCommandLog } from '../../entities/io-command-log.entity';
import { MqttModule } from '../mqtt/mqtt.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { IoController } from './io.controller';
import { IoMonitorController } from './io-monitor.controller';
import { IoService } from './io.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Box, Rack, EthernetIo, IoCommandLog]),
    MqttModule,
    forwardRef(() => RealtimeModule),
  ],
  controllers: [IoController, IoMonitorController],
  providers: [IoService],
  exports: [IoService],
})
export class IoModule {}
