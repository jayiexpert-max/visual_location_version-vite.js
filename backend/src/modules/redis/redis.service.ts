import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const DEVICE_PRESENCE_TTL_SEC = 90;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private available = false;
  private readonly memoryPresence = new Map<
    number,
    { online: boolean; ip: string; expiresAt: number }
  >();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const host = this.configService.get<string>('redis.host', '127.0.0.1');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password', '');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
      });

      this.client.on('error', (error) => {
        this.available = false;
        this.logger.warn(`Redis error: ${error.message}`);
      });

      void this.client.connect().then(() => {
        this.available = true;
        this.logger.log(`Connected to Redis at ${host}:${port}`);
      }).catch((error: Error) => {
        this.available = false;
        this.logger.warn(`Redis unavailable, using in-memory fallback: ${error.message}`);
      });
    } catch (error) {
      this.available = false;
      this.logger.warn(
        `Redis init failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  isAvailable(): boolean {
    return this.available && (this.client?.status === 'ready');
  }

  async setDevicePresence(
    deviceId: number,
    online: boolean,
    ip: string,
  ): Promise<void> {
    const key = this.deviceKey(deviceId);
    const value = JSON.stringify({ online, ip, updatedAt: Date.now() });

    if (this.isAvailable() && this.client) {
      await this.client.setex(key, DEVICE_PRESENCE_TTL_SEC, value);
      return;
    }

    this.memoryPresence.set(deviceId, {
      online,
      ip,
      expiresAt: Date.now() + DEVICE_PRESENCE_TTL_SEC * 1000,
    });
  }

  async isDeviceOnline(deviceId: number): Promise<boolean> {
    if (this.isAvailable() && this.client) {
      const value = await this.client.get(this.deviceKey(deviceId));
      if (!value) {
        return false;
      }
      try {
        const parsed = JSON.parse(value) as { online?: boolean };
        return parsed.online === true;
      } catch {
        return false;
      }
    }

    const entry = this.memoryPresence.get(deviceId);
    if (!entry) {
      return false;
    }
    if (entry.expiresAt < Date.now()) {
      this.memoryPresence.delete(deviceId);
      return false;
    }
    return entry.online;
  }

  private deviceKey(deviceId: number): string {
    return `raspi:device:${deviceId}:status`;
  }
}
