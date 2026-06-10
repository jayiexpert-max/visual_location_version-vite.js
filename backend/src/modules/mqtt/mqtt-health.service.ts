import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RaspberryDevice, RaspberryDeviceStatus } from '../../entities/raspberry-device.entity';
import { RedisService } from '../redis/redis.service';
import { MqttConnectionService } from './mqtt-connection.service';
import { MqttLogService } from './mqtt-log.service';

@Injectable()
export class MqttHealthService {
  constructor(
    private readonly mqttConnection: MqttConnectionService,
    private readonly mqttLogService: MqttLogService,
    private readonly redisService: RedisService,
    @InjectRepository(RaspberryDevice)
    private readonly raspberryDeviceRepository: Repository<RaspberryDevice>,
  ) {}

  async getMqttHealth() {
    const recentLogs = await this.mqttLogService.findRecent({ limit: 5 });

    return {
      status: this.mqttConnection.isConnected() ? 'ok' : 'error',
      connected: this.mqttConnection.isConnected(),
      lastConnectedAt: this.mqttConnection.getLastConnectedAt()?.toISOString() ?? null,
      lastError: this.mqttConnection.getLastError(),
      recentMessages: recentLogs.length,
      redisAvailable: this.redisService.isAvailable(),
    };
  }

  async getRaspiHealth() {
    const devices = await this.raspberryDeviceRepository.find({
      order: { deviceId: 'ASC' },
    });

    const online = devices.filter(
      (d) => d.status === RaspberryDeviceStatus.Online,
    ).length;

    const presence = await Promise.all(
      devices.map(async (device) => ({
        deviceId: device.deviceId,
        redisOnline: await this.redisService.isDeviceOnline(device.deviceId),
      })),
    );

    return {
      status: online > 0 ? 'ok' : devices.length > 0 ? 'degraded' : 'unknown',
      totalDevices: devices.length,
      onlineDevices: online,
      offlineDevices: devices.length - online,
      devices: devices.map((device) => ({
        deviceId: device.deviceId,
        ipAddress: device.ipAddress,
        status: device.status,
        lastHeartbeatAt: device.lastHeartbeatAt?.toISOString() ?? null,
        outputCount: device.outputCount,
        redisOnline:
          presence.find((p) => p.deviceId === device.deviceId)?.redisOnline ??
          false,
      })),
    };
  }

  async getIoHealth() {
    const [commandCount, deviceCount] = await Promise.all([
      this.mqttLogService.findRecent({ limit: 1 }),
      this.raspberryDeviceRepository.count(),
    ]);

    return {
      status: this.mqttConnection.isConnected() ? 'ok' : 'error',
      mqttConnected: this.mqttConnection.isConnected(),
      registeredDevices: deviceCount,
      hasRecentActivity: commandCount.length > 0,
    };
  }
}
