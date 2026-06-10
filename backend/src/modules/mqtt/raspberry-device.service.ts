import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RaspberryDevice,
  RaspberryDeviceStatus,
} from '../../entities/raspberry-device.entity';

export interface UpsertHeartbeatParams {
  deviceId: number;
  ipAddress?: string;
  status: RaspberryDeviceStatus;
  lastHeartbeatAt: Date;
  outputCount?: number;
  hostname?: string;
}

@Injectable()
export class RaspberryDeviceService {
  constructor(
    @InjectRepository(RaspberryDevice)
    private readonly repository: Repository<RaspberryDevice>,
  ) {}

  findAll(): Promise<RaspberryDevice[]> {
    return this.repository.find({ order: { deviceId: 'ASC' } });
  }

  findByDeviceId(deviceId: number): Promise<RaspberryDevice | null> {
    return this.repository.findOne({ where: { deviceId } });
  }

  async register(params: {
    deviceId: number;
    ethernetIoId?: number | null;
    hostname?: string;
    ipAddress?: string;
    outputCount?: number;
  }): Promise<RaspberryDevice> {
    const existing = await this.findByDeviceId(params.deviceId);

    if (existing) {
      existing.ethernetIoId = params.ethernetIoId ?? existing.ethernetIoId;
      existing.hostname = params.hostname ?? existing.hostname;
      existing.ipAddress = params.ipAddress ?? existing.ipAddress;
      existing.outputCount = params.outputCount ?? existing.outputCount;
      return this.repository.save(existing);
    }

    return this.repository.save(
      this.repository.create({
        deviceId: params.deviceId,
        ethernetIoId: params.ethernetIoId ?? null,
        hostname: params.hostname ?? null,
        ipAddress: params.ipAddress ?? null,
        outputCount: params.outputCount ?? 16,
        status: RaspberryDeviceStatus.Unknown,
      }),
    );
  }

  async upsertHeartbeat(params: UpsertHeartbeatParams): Promise<RaspberryDevice> {
    const existing = await this.findByDeviceId(params.deviceId);

    if (existing) {
      existing.status = params.status;
      existing.lastHeartbeatAt = params.lastHeartbeatAt;
      existing.ipAddress = params.ipAddress ?? existing.ipAddress;
      existing.hostname = params.hostname ?? existing.hostname;
      if (params.outputCount) {
        existing.outputCount = params.outputCount;
      }
      return this.repository.save(existing);
    }

    return this.repository.save(
      this.repository.create({
        deviceId: params.deviceId,
        ipAddress: params.ipAddress ?? null,
        hostname: params.hostname ?? null,
        status: params.status,
        lastHeartbeatAt: params.lastHeartbeatAt,
        outputCount: params.outputCount ?? 16,
      }),
    );
  }

  async markStaleDevicesOffline(thresholdMinutes = 2): Promise<number> {
    const threshold = new Date(Date.now() - thresholdMinutes * 60_000);
    const result = await this.repository
      .createQueryBuilder()
      .update(RaspberryDevice)
      .set({ status: RaspberryDeviceStatus.Offline })
      .where('status = :online', { online: RaspberryDeviceStatus.Online })
      .andWhere('last_heartbeat_at < :threshold', { threshold })
      .execute();

    return result.affected ?? 0;
  }
}
