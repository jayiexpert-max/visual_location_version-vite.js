import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttLog } from '../../entities/mqtt-log.entity';
import { RaspberryDevice } from '../../entities/raspberry-device.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { MqttConfigService } from './mqtt-config.service';
import { MqttConnectionService } from './mqtt-connection.service';
import { MqttHealthService } from './mqtt-health.service';
import { MqttLogService } from './mqtt-log.service';
import { MqttPublisherService } from './mqtt-publisher.service';
import { MqttSubscriberService } from './mqtt-subscriber.service';
import { RaspberryDeviceService } from './raspberry-device.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MqttLog, RaspberryDevice]),
    forwardRef(() => RealtimeModule),
  ],
  providers: [
    MqttConfigService,
    MqttConnectionService,
    MqttLogService,
    MqttPublisherService,
    MqttSubscriberService,
    MqttHealthService,
    RaspberryDeviceService,
  ],
  exports: [
    MqttConfigService,
    MqttConnectionService,
    MqttLogService,
    MqttPublisherService,
    MqttSubscriberService,
    MqttHealthService,
    RaspberryDeviceService,
  ],
})
export class MqttModule {}
