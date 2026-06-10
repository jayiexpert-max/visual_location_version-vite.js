import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Box } from '../../entities/box.entity';
import { Rack } from '../../entities/rack.entity';
import { EthernetIo } from '../../entities/ethernet-io.entity';
import { IoCommandLog } from '../../entities/io-command-log.entity';
import { IoController } from './io.controller';
import { IoService } from './io.service';
import { MqttPublisherService } from './mqtt-publisher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Box, Rack, EthernetIo, IoCommandLog]),
  ],
  controllers: [IoController],
  providers: [MqttPublisherService, IoService],
  exports: [IoService, MqttPublisherService],
})
export class IoModule {}
