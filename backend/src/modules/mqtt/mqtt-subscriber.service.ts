import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type { MqttDeviceStatusPayload } from '@visual-location/shared';
import { MqttTopics } from '@visual-location/shared';
import { RaspberryDeviceStatus } from '../../entities/raspberry-device.entity';
import { HighlightGateway } from '../realtime/highlight.gateway';
import { RaspberryDeviceService } from './raspberry-device.service';
import { RedisService } from '../redis/redis.service';
import { MqttConfigService } from './mqtt-config.service';
import { MqttConnectionService } from './mqtt-connection.service';
import { MqttLogService } from './mqtt-log.service';

@Injectable()
export class MqttSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(MqttSubscriberService.name);
  private subscribed = false;

  constructor(
    private readonly mqttConfig: MqttConfigService,
    private readonly mqttConnection: MqttConnectionService,
    private readonly mqttLogService: MqttLogService,
    private readonly raspberryDeviceService: RaspberryDeviceService,
    private readonly redisService: RedisService,
    private readonly highlightGateway: HighlightGateway,
  ) {}

  onModuleInit(): void {
    void this.setupSubscriptions().catch((error: Error) => {
      this.logger.warn(`MQTT subscriptions deferred: ${error.message}`);
    });

    const client = this.mqttConnection.getClient();
    client?.on('connect', () => {
      void this.setupSubscriptions();
    });
  }

  private async setupSubscriptions(): Promise<void> {
    if (this.subscribed) {
      return;
    }

    const client = await this.mqttConnection.ensureConnected();
    const patterns = this.mqttConfig.subscribePatterns;

    await Promise.all(
      patterns.map(
        (pattern) =>
          new Promise<void>((resolve, reject) => {
            client.subscribe(pattern, { qos: 0 }, (error) => {
              if (error) {
                reject(error);
                return;
              }
              resolve();
            });
          }),
      ),
    );

    client.on('message', (topic, buffer) => {
      void this.handleMessage(topic, buffer);
    });

    this.subscribed = true;
    this.logger.log(`Subscribed to MQTT patterns: ${patterns.join(', ')}`);
  }

  private async handleMessage(topic: string, buffer: Buffer): Promise<void> {
    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(buffer.toString()) as Record<string, unknown>;
    } catch {
      payload = { raw: buffer.toString() };
    }

    const deviceId = this.extractDeviceId(topic, payload);

    await this.mqttLogService.logInbound({
      topic,
      payload,
      deviceId,
    });

    if (topic === MqttTopics.factoryDeviceStatus) {
      await this.handleDeviceStatus(payload as unknown as MqttDeviceStatusPayload);
      return;
    }

    if (
      topic === MqttTopics.factoryLocationStatus ||
      topic === MqttTopics.factoryRackStatus ||
      topic === MqttTopics.factoryLocationLight
    ) {
      this.highlightGateway.emitIoStatus({
        topic,
        payload,
        deviceId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleDeviceStatus(
    payload: MqttDeviceStatusPayload,
  ): Promise<void> {
    const deviceId = Number(payload.deviceId);
    if (!Number.isFinite(deviceId) || deviceId <= 0) {
      return;
    }

    const isOnline = payload.status === 'online';
    const heartbeatAt = payload.timestamp
      ? new Date(payload.timestamp)
      : new Date();

    await this.raspberryDeviceService.upsertHeartbeat({
      deviceId,
      ipAddress: payload.ip,
      status: isOnline
        ? RaspberryDeviceStatus.Online
        : RaspberryDeviceStatus.Offline,
      lastHeartbeatAt: heartbeatAt,
    });

    await this.redisService.setDevicePresence(deviceId, isOnline, payload.ip);

    if (isOnline) {
      this.highlightGateway.emitDeviceOnline({
        deviceId,
        ip: payload.ip,
        timestamp: heartbeatAt.toISOString(),
      });
    } else {
      this.highlightGateway.emitDeviceOffline({
        deviceId,
        timestamp: heartbeatAt.toISOString(),
      });
    }
  }

  private extractDeviceId(
    topic: string,
    payload: Record<string, unknown>,
  ): number | null {
    if (typeof payload.deviceId === 'number') {
      return payload.deviceId;
    }

    const match = topic.match(/visual\/io\/(\d+)\//);
    if (match) {
      return Number(match[1]);
    }

    return null;
  }
}
