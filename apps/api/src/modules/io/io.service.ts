import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Box } from '../../entities/box.entity';
import { Rack } from '../../entities/rack.entity';
import { EthernetIo } from '../../entities/ethernet-io.entity';
import {
  IoCommandAction,
  IoCommandLog,
  IoCommandStatus,
} from '../../entities/io-command-log.entity';
import { MqttPublisherService } from './mqtt-publisher.service';
import type { IoBoxCommandDto, IoCommandResultDto } from './dto/io-command.dto';

export interface IoOutputPlan {
  pin: number;
  state: number;
  role: string;
}

export interface IoDevicePlan {
  deviceId: number;
  device: EthernetIo;
  outputs: IoOutputPlan[];
}

export interface IoBoxPlan {
  location: {
    boxId: number;
    boxCode: string | null;
    slotNo: number | null;
    levelNo: number | null;
    rackName: string | null;
    resetAll?: boolean;
  };
  devices: IoDevicePlan[];
}

@Injectable()
export class IoService {
  private readonly logger = new Logger(IoService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mqttPublisher: MqttPublisherService,
    @InjectRepository(Box)
    private readonly boxRepository: Repository<Box>,
    @InjectRepository(Rack)
    private readonly rackRepository: Repository<Rack>,
    @InjectRepository(EthernetIo)
    private readonly ethernetIoRepository: Repository<EthernetIo>,
    @InjectRepository(IoCommandLog)
    private readonly ioCommandLogRepository: Repository<IoCommandLog>,
  ) {}

  async highlightBox(
    dto: IoBoxCommandDto,
    userId?: number,
  ): Promise<IoCommandResultDto> {
    return this.executeBoxAction('highlight', dto, userId);
  }

  async offBox(
    dto: IoBoxCommandDto,
    userId?: number,
  ): Promise<IoCommandResultDto> {
    return this.executeBoxAction('off', dto, userId);
  }

  async resetAll(userId?: number): Promise<IoCommandResultDto> {
    const byDevice = await this.collectAllMappedOutputs();

    if (byDevice.size === 0) {
      return {
        status: 'warning',
        message: 'No IO pins configured in boxes/racks',
      };
    }

    const devices: IoDevicePlan[] = [];
    let pinCount = 0;

    for (const [deviceId, outputs] of byDevice.entries()) {
      const device = await this.ethernetIoRepository.findOne({
        where: { id: deviceId },
      });
      if (!device) {
        continue;
      }
      devices.push({ deviceId, device, outputs });
      pinCount += outputs.length;
    }

    if (devices.length === 0) {
      return {
        status: 'warning',
        message: 'No valid IO devices found for configured pins',
      };
    }

    const plan: IoBoxPlan = {
      location: {
        boxId: 0,
        boxCode: '',
        slotNo: null,
        levelNo: null,
        rackName: '',
        resetAll: true,
      },
      devices,
    };

    await this.publishReset(plan, userId);

    return {
      status: 'success',
      message: `All lights reset (${pinCount} outputs off)`,
      pinCount,
    };
  }

  async resolveBoxPlan(
    boxId: number,
    action: 'highlight' | 'off' = 'highlight',
    slotNo?: number | null,
  ): Promise<IoBoxPlan | null> {
    if (boxId <= 0) {
      return null;
    }

    const row = await this.boxRepository
      .createQueryBuilder('b')
      .innerJoin('b.level', 'l')
      .innerJoin('l.rack', 'r')
      .select([
        'b.id AS box_id',
        'b.box_code AS box_code',
        'b.io_device_id AS box_dev',
        'b.io_output_pin AS box_pin',
        'l.level_no AS level_no',
        'r.name AS rack_name',
        'r.io_device_id AS rack_dev',
        'r.io_green_pin AS io_green_pin',
      ])
      .where('b.id = :boxId', { boxId })
      .getRawOne<{
        box_id: number;
        box_code: string | null;
        box_dev: number | null;
        box_pin: number | null;
        level_no: number | null;
        rack_name: string | null;
        rack_dev: number | null;
        io_green_pin: number | null;
      }>();

    if (!row) {
      return null;
    }

    const state = action === 'off' ? 0 : 1;
    const deviceOutputs = new Map<number, IoOutputPlan[]>();

    const addOutput = (deviceId: number, pin: number, role: string): void => {
      if (deviceId <= 0 || pin <= 0) {
        return;
      }
      const outputs = deviceOutputs.get(deviceId) ?? [];
      outputs.push({ pin, state, role });
      deviceOutputs.set(deviceId, outputs);
    };

    addOutput(Number(row.box_dev ?? 0), Number(row.box_pin ?? 0), 'box');
    addOutput(Number(row.rack_dev ?? 0), Number(row.io_green_pin ?? 0), 'green');

    if (deviceOutputs.size === 0) {
      return null;
    }

    const devices: IoDevicePlan[] = [];

    for (const [deviceId, outputs] of deviceOutputs.entries()) {
      const device = await this.ethernetIoRepository.findOne({
        where: { id: deviceId },
      });
      if (!device) {
        continue;
      }
      devices.push({ deviceId, device, outputs });
    }

    if (devices.length === 0) {
      return null;
    }

    return {
      location: {
        boxId: row.box_id,
        boxCode: row.box_code,
        slotNo: slotNo ?? null,
        levelNo: row.level_no,
        rackName: row.rack_name,
      },
      devices,
    };
  }

  private async executeBoxAction(
    action: 'highlight' | 'off',
    dto: IoBoxCommandDto,
    userId?: number,
  ): Promise<IoCommandResultDto> {
    const plan = await this.resolveBoxPlan(dto.boxId, action, dto.slotNo ?? null);

    if (!plan) {
      return {
        status: 'warning',
        message: 'No IO mapping configured for this box',
      };
    }

    const durationSec = this.configService.get<number>(
      'mqtt.highlightDurationSec',
      60,
    );

    for (const entry of plan.devices) {
      const payload = {
        action,
        duration_sec: action === 'off' ? 0 : durationSec,
        device_name: entry.device.name,
        location: plan.location,
        outputs: entry.outputs,
      };

      const topicAction = action === 'off' ? 'off' : 'highlight';

      try {
        if (topicAction === 'off') {
          await this.mqttPublisher.publishOff(entry.deviceId, payload);
        } else {
          await this.mqttPublisher.publishHighlight(entry.deviceId, payload);
        }

        await this.logCommand({
          userId,
          deviceId: entry.deviceId,
          action: action === 'off' ? IoCommandAction.Off : IoCommandAction.Highlight,
          topic: topicAction,
          payload,
          boxId: dto.boxId,
          slotNo: dto.slotNo ?? null,
          status: IoCommandStatus.Published,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'MQTT publish failed';

        await this.logCommand({
          userId,
          deviceId: entry.deviceId,
          action: action === 'off' ? IoCommandAction.Off : IoCommandAction.Highlight,
          topic: topicAction,
          payload,
          boxId: dto.boxId,
          slotNo: dto.slotNo ?? null,
          status: IoCommandStatus.Failed,
          errorMessage: message,
        });

        throw new BadRequestException(message);
      }
    }

    return {
      status: 'success',
      message: action === 'off' ? 'IO turned off' : 'IO highlight sent',
    };
  }

  private async publishReset(plan: IoBoxPlan, userId?: number): Promise<void> {
    const payload = {
      action: 'reset',
      duration_sec: 0,
      location: plan.location,
      devices: plan.devices.map((entry) => ({
        device_id: entry.deviceId,
        device_name: entry.device.name,
        outputs: entry.outputs,
      })),
    };

    try {
      await this.mqttPublisher.publishReset(payload);

      await this.logCommand({
        userId,
        deviceId: null,
        action: IoCommandAction.Reset,
        topic: 'reset',
        payload,
        boxId: null,
        slotNo: null,
        status: IoCommandStatus.Published,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'MQTT reset publish failed';

      await this.logCommand({
        userId,
        deviceId: null,
        action: IoCommandAction.Reset,
        topic: 'reset',
        payload,
        boxId: null,
        slotNo: null,
        status: IoCommandStatus.Failed,
        errorMessage: message,
      });

      throw new BadRequestException(message);
    }
  }

  private async collectAllMappedOutputs(): Promise<Map<number, IoOutputPlan[]>> {
    const seen = new Set<string>();
    const byDevice = new Map<number, IoOutputPlan[]>();

    const addOutput = (deviceId: number, pin: number, role: string): void => {
      if (deviceId <= 0 || pin <= 0) {
        return;
      }
      const key = `${deviceId}:${pin}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      const outputs = byDevice.get(deviceId) ?? [];
      outputs.push({ pin, state: 0, role });
      byDevice.set(deviceId, outputs);
    };

    const boxes = await this.boxRepository
      .createQueryBuilder('b')
      .select(['b.io_device_id AS device_id', 'b.io_output_pin AS pin'])
      .where('b.io_device_id IS NOT NULL')
      .andWhere('b.io_output_pin IS NOT NULL')
      .andWhere('b.io_output_pin > 0')
      .getRawMany<{ device_id: number; pin: number }>();

    for (const box of boxes) {
      addOutput(Number(box.device_id), Number(box.pin), 'box');
    }

    const racks = await this.rackRepository.find({
      where: {},
      select: [
        'ioDeviceId',
        'ioRedPin',
        'ioYellowPin',
        'ioGreenPin',
        'ioBuzzerPin',
      ],
    });

    for (const rack of racks) {
      const deviceId = rack.ioDeviceId ?? 0;
      addOutput(deviceId, rack.ioRedPin ?? 0, 'red');
      addOutput(deviceId, rack.ioYellowPin ?? 0, 'yellow');
      addOutput(deviceId, rack.ioGreenPin ?? 0, 'green');
      addOutput(deviceId, rack.ioBuzzerPin ?? 0, 'buzzer');
    }

    return byDevice;
  }

  private async logCommand(params: {
    userId?: number;
    deviceId: number | null;
    action: IoCommandAction;
    topic: string;
    payload: Record<string, unknown>;
    boxId: number | null;
    slotNo: number | null;
    status: IoCommandStatus;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const topicPrefix = this.configService.get<string>(
        'mqtt.topicPrefix',
        'visual/io',
      );
      const mqttTopic =
        params.topic === 'reset'
          ? `${topicPrefix}/reset`
          : `${topicPrefix}/${params.deviceId}/${params.topic}`;

      await this.ioCommandLogRepository.save(
        this.ioCommandLogRepository.create({
          userId: params.userId ?? null,
          deviceId: params.deviceId,
          action: params.action,
          mqttTopic,
          payloadJson: params.payload,
          boxId: params.boxId,
          slotNo: params.slotNo,
          status: params.status,
          errorMessage: params.errorMessage ?? null,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to write io_command_logs: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
