import { Injectable, Logger } from '@nestjs/common';
import type {
  MqttHighlightPayload,
  MqttOffPayload,
  MqttResetPayload,
} from '@visual-location/shared';
import { MqttLogStatus } from '../../entities/mqtt-log.entity';
import { MqttConfigService } from './mqtt-config.service';
import { MqttConnectionService } from './mqtt-connection.service';
import { MqttLogService } from './mqtt-log.service';

@Injectable()
export class MqttPublisherService {
  private readonly logger = new Logger(MqttPublisherService.name);

  constructor(
    private readonly mqttConfig: MqttConfigService,
    private readonly mqttConnection: MqttConnectionService,
    private readonly mqttLogService: MqttLogService,
  ) {}

  isConnected(): boolean {
    return this.mqttConnection.isConnected();
  }

  async publishHighlight(payload: MqttHighlightPayload): Promise<void> {
    const topic = this.mqttConfig.highlightTopic(payload.deviceId);
    await this.publish(topic, payload, payload.deviceId);
  }

  async publishOff(payload: MqttOffPayload): Promise<void> {
    const topic = this.mqttConfig.offTopic(payload.deviceId);
    await this.publish(topic, payload, payload.deviceId);
  }

  async publishReset(payload: MqttResetPayload): Promise<void> {
    const topic = this.mqttConfig.resetTopic();
    await this.publish(topic, payload, null);
  }

  async publish(
    topic: string,
    payload: Record<string, unknown>,
    deviceId: number | null,
  ): Promise<void> {
    const client = await this.mqttConnection.ensureConnected();
    const message = JSON.stringify(payload);

    try {
      await new Promise<void>((resolve, reject) => {
        client.publish(topic, message, { qos: 1 }, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      await this.mqttLogService.logOutbound({
        topic,
        payload,
        deviceId,
        qos: 1,
        status: MqttLogStatus.Published,
      });

      this.logger.debug(`Published MQTT message to ${topic}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'MQTT publish failed';

      await this.mqttLogService.logOutbound({
        topic,
        payload,
        deviceId,
        qos: 1,
        status: MqttLogStatus.Failed,
        errorMessage,
      });

      throw error;
    }
  }
}
