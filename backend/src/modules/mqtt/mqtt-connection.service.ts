import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import mqtt, { MqttClient } from 'mqtt';
import { MqttConfigService } from './mqtt-config.service';

@Injectable()
export class MqttConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttConnectionService.name);
  private client: MqttClient | null = null;
  private connecting: Promise<void> | null = null;
  private lastConnectedAt: Date | null = null;
  private lastError: string | null = null;
  private mqttIssueLogged = false;

  constructor(private readonly mqttConfig: MqttConfigService) {}

  onModuleInit(): void {
    void this.ensureConnected().catch((error: Error) => {
      this.lastError = error.message;
      this.logger.warn(`MQTT broker not available at startup: ${error.message}`);
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

  async ensureConnected(): Promise<MqttClient> {
    if (this.client?.connected) {
      return this.client;
    }

    if (this.connecting) {
      await this.connecting;
      if (!this.client?.connected) {
        throw new Error(this.lastError ?? 'MQTT client is not connected');
      }
      return this.client;
    }

    this.connecting = this.connect();
    await this.connecting;
    this.connecting = null;

    if (!this.client?.connected) {
      throw new Error(this.lastError ?? 'MQTT client is not connected');
    }

    return this.client;
  }

  getClient(): MqttClient | null {
    return this.client;
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  getLastConnectedAt(): Date | null {
    return this.lastConnectedAt;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  private async connect(): Promise<void> {
    const brokerUrl = this.mqttConfig.brokerUrl;
    const clientId = `${this.mqttConfig.clientId}-${process.pid}`;

    this.client = mqtt.connect(brokerUrl, {
      clientId,
      username: this.mqttConfig.username || undefined,
      password: this.mqttConfig.password || undefined,
      reconnectPeriod: 5000,
      connectTimeout: 10_000,
      clean: true,
    });

    this.client.on('error', (error) => {
      this.lastError = error.message;
      if (!this.mqttIssueLogged) {
        this.mqttIssueLogged = true;
        this.logger.warn(`MQTT broker unavailable: ${error.message}`);
      }
    });

    this.client.on('reconnect', () => {
      if (!this.mqttIssueLogged) {
        this.mqttIssueLogged = true;
        this.logger.warn('MQTT broker unavailable, retrying in background...');
      }
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MQTT connection timed out'));
      }, 10_000);

      this.client?.once('connect', () => {
        clearTimeout(timeout);
        this.lastConnectedAt = new Date();
        this.lastError = null;
        this.mqttIssueLogged = false;
        this.logger.log(`Connected to MQTT broker at ${brokerUrl}`);
        resolve();
      });

      this.client?.once('error', (error) => {
        clearTimeout(timeout);
        this.lastError = error.message;
        reject(error);
      });
    });
  }
}
