import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MqttTopics } from '@visual-location/shared';

@Injectable()
export class MqttConfigService {
  constructor(private readonly configService: ConfigService) {}

  get brokerUrl(): string {
    return this.configService.getOrThrow<string>('mqtt.brokerUrl');
  }

  get clientId(): string {
    return this.configService.getOrThrow<string>('mqtt.clientId');
  }

  get username(): string {
    return this.configService.get<string>('mqtt.username', '');
  }

  get password(): string {
    return this.configService.get<string>('mqtt.password', '');
  }

  get topicPrefix(): string {
    return this.configService.get<string>('mqtt.topicPrefix', 'visual/io');
  }

  get highlightDurationSec(): number {
    return this.configService.get<number>('mqtt.highlightDurationSec', 60);
  }

  get subscribePatterns(): string[] {
    return [
      MqttTopics.factoryDeviceStatus,
      MqttTopics.factoryLocationStatus,
      MqttTopics.factoryRackStatus,
      MqttTopics.factoryLocationLight,
      `${this.topicPrefix}/+/highlight`,
      `${this.topicPrefix}/+/off`,
      `${this.topicPrefix}/reset`,
    ];
  }

  highlightTopic(deviceId: number): string {
    return `${this.topicPrefix}/${deviceId}/highlight`;
  }

  offTopic(deviceId: number): string {
    return `${this.topicPrefix}/${deviceId}/off`;
  }

  resetTopic(): string {
    return `${this.topicPrefix}/reset`;
  }
}
