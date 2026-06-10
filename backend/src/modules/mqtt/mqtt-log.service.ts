import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MqttLog,
  MqttLogDirection,
  MqttLogStatus,
} from '../../entities/mqtt-log.entity';

export interface MqttLogQuery {
  direction?: MqttLogDirection;
  deviceId?: number;
  topic?: string;
  limit?: number;
}

@Injectable()
export class MqttLogService {
  private readonly logger = new Logger(MqttLogService.name);

  constructor(
    @InjectRepository(MqttLog)
    private readonly mqttLogRepository: Repository<MqttLog>,
  ) {}

  async logOutbound(params: {
    topic: string;
    payload: Record<string, unknown>;
    deviceId?: number | null;
    qos?: number;
    status: MqttLogStatus;
    errorMessage?: string;
  }): Promise<void> {
    await this.save({
      direction: MqttLogDirection.Outbound,
      topic: params.topic,
      payloadJson: params.payload,
      qos: params.qos ?? 1,
      deviceId: params.deviceId ?? null,
      status: params.status,
      errorMessage: params.errorMessage ?? null,
    });
  }

  async logInbound(params: {
    topic: string;
    payload: Record<string, unknown>;
    deviceId?: number | null;
    qos?: number;
  }): Promise<void> {
    await this.save({
      direction: MqttLogDirection.Inbound,
      topic: params.topic,
      payloadJson: params.payload,
      qos: params.qos ?? 0,
      deviceId: params.deviceId ?? null,
      status: MqttLogStatus.Received,
      errorMessage: null,
    });
  }

  async findRecent(query: MqttLogQuery = {}): Promise<MqttLog[]> {
    const qb = this.mqttLogRepository
      .createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC')
      .take(query.limit ?? 100);

    if (query.direction) {
      qb.andWhere('log.direction = :direction', { direction: query.direction });
    }
    if (query.deviceId) {
      qb.andWhere('log.device_id = :deviceId', { deviceId: query.deviceId });
    }
    if (query.topic) {
      qb.andWhere('log.topic LIKE :topic', { topic: `%${query.topic}%` });
    }

    return qb.getMany();
  }

  private async save(entry: Partial<MqttLog>): Promise<void> {
    try {
      await this.mqttLogRepository.save(this.mqttLogRepository.create(entry));
    } catch (error) {
      this.logger.warn(
        `Failed to write mqtt_logs: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
