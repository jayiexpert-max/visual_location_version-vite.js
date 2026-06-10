import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { MqttLogDirection } from '../../entities/mqtt-log.entity';
import { MqttHealthService } from '../mqtt/mqtt-health.service';
import { MqttLogService } from '../mqtt/mqtt-log.service';
import { RaspberryDeviceService } from '../mqtt/raspberry-device.service';
import { HighlightGateway } from '../realtime/highlight.gateway';

@ApiTags('io-monitor')
@ApiBearerAuth('access-token')
@Controller('io/monitor')
@Roles('admin')
export class IoMonitorController {
  constructor(
    private readonly mqttLogService: MqttLogService,
    private readonly mqttHealthService: MqttHealthService,
    private readonly raspberryDeviceService: RaspberryDeviceService,
    private readonly highlightGateway: HighlightGateway,
  ) {}

  @Get('mqtt-logs')
  @ApiOperation({ summary: 'Recent MQTT message log (admin)' })
  mqttLogs(
    @Query('direction') direction?: MqttLogDirection,
    @Query('deviceId') deviceId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.mqttLogService.findRecent({
      direction,
      deviceId: deviceId ? Number(deviceId) : undefined,
      limit: limit ? Number(limit) : 100,
    });
  }

  @Get('raspberry-devices')
  @ApiOperation({ summary: 'Registered Raspberry Pi devices' })
  raspberryDevices() {
    return this.raspberryDeviceService.findAll();
  }

  @Get('realtime-events')
  @ApiOperation({ summary: 'Recent Socket.IO events emitted by server' })
  realtimeEvents(@Query('limit') limit?: string) {
    return this.highlightGateway.getRecentEvents(
      limit ? Number(limit) : 50,
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Combined IoT monitor health snapshot' })
  async monitorHealth() {
    const [mqtt, raspi, io] = await Promise.all([
      this.mqttHealthService.getMqttHealth(),
      this.mqttHealthService.getRaspiHealth(),
      this.mqttHealthService.getIoHealth(),
    ]);

    return { mqtt, raspi, io };
  }
}
