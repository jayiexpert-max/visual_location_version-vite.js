import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mqtt, { MqttClient } from 'mqtt';
import { MqttTopics } from '@visual-location/shared';

@Injectable()
export class MqttPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttPublisherService.name);
  private client: MqttClient | null = null;
  private connecting: Promise<void> | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    void this.ensureConnected().catch((error: Error) => {
      this.logger.warn(
        `MQTT broker not available at startup: ${error.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client?.end(false, {}, () => resolve());
      });
      this.client = null;
    }
  }

  async publishHighlight(
    deviceId: number,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.publish(MqttTopics.highlight(deviceId), payload);
  }

  async publishOff(
    deviceId: number,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.publish(MqttTopics.off(deviceId), payload);
  }

  async publishReset(payload: Record<string, unknown>): Promise<void> {
    await this.publish(MqttTopics.reset, payload);
  }

  async publish(topic: string, payload: Record<string, unknown>): Promise<void> {
    await this.ensureConnected();

    if (!this.client?.connected) {
      throw new Error('MQTT client is not connected');
    }

    const message = JSON.stringify(payload);

    await new Promise<void>((resolve, reject) => {
      this.client?.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    this.logger.debug(`Published MQTT message to ${topic}`);
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  private async ensureConnected(): Promise<void> {
    if (this.client?.connected) {
      return;
    }

    if (this.connecting) {
      await this.connecting;
      return;
    }

    this.connecting = this.connect();
    await this.connecting;
    this.connecting = null;
  }

  private async connect(): Promise<void> {
    const brokerUrl = this.configService.getOrThrow<string>('mqtt.brokerUrl');
    const clientId = this.configService.getOrThrow<string>('mqtt.clientId');
    const username = this.configService.get<string>('mqtt.username', '');
    const password = this.configService.get<string>('mqtt.password', '');

    this.client = mqtt.connect(brokerUrl, {
      clientId,
      username: username || undefined,
      password: password || undefined,
      reconnectPeriod: 5000,
      connectTimeout: 10_000,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MQTT connection timed out'));
      }, 10_000);

      this.client?.once('connect', () => {
        clearTimeout(timeout);
        this.logger.log(`Connected to MQTT broker at ${brokerUrl}`);
        resolve();
      });

      this.client?.once('error', (error) => {
        clearTimeout(timeout);
        this.logger.error(`MQTT connection error: ${error.message}`);
        reject(error);
      });
    });
  }
}
