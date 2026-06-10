import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  MqttHighlightPayload,
  MqttOffPayload,
  MqttResetPayload,
} from '@visual-location/shared';
import { Box } from '../../entities/box.entity';
import { Rack } from '../../entities/rack.entity';
import { EthernetIo } from '../../entities/ethernet-io.entity';
import {
  IoCommandAction,
  IoCommandLog,
  IoCommandStatus,
} from '../../entities/io-command-log.entity';
import { AuditCategory, AuditStatus } from '../../entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { MqttPublisherService } from '../mqtt/mqtt-publisher.service';
import { MqttConfigService } from '../mqtt/mqtt-config.service';
import { HighlightGateway } from '../realtime/highlight.gateway';
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
    slotId: number | null;
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
    private readonly mqttPublisher: MqttPublisherService,
    private readonly mqttConfig: MqttConfigService,
    private readonly highlightGateway: HighlightGateway,
    private readonly auditService: AuditService,
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

    const payload: MqttResetPayload = { command: 'reset' };

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

      this.highlightGateway.emitIoStatus({
        topic: this.mqttConfig.resetTopic(),
        payload,
        deviceId: null,
        timestamp: new Date().toISOString(),
      });
      this.highlightGateway.emitHighlightClear();

      return {
        status: 'success',
        message: 'All IO outputs reset via MQTT',
      };
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

  async resolveBoxPlan(
    boxId: number,
    action: 'highlight' | 'off' = 'highlight',
    slotNo?: number | null,
    slotId?: number | null,
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
        'r.io_red_pin AS io_red_pin',
        'r.io_yellow_pin AS io_yellow_pin',
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
        io_red_pin: number | null;
        io_yellow_pin: number | null;
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
    addOutput(Number(row.rack_dev ?? 0), Number(row.io_red_pin ?? 0), 'red');
    addOutput(Number(row.rack_dev ?? 0), Number(row.io_yellow_pin ?? 0), 'yellow');

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
        slotId: slotId ?? null,
        slotNo: slotNo ?? null,
        levelNo: row.level_no,
        rackName: row.rack_name,
      },
      devices,
    };
  }

  async listDevices(): Promise<EthernetIo[]> {
    return this.ethernetIoRepository.find({ order: { id: 'ASC' } });
  }

  async getStatus() {
    const [devices, recentLogs] = await Promise.all([
      this.listDevices(),
      this.ioCommandLogRepository.find({
        order: { createdAt: 'DESC' },
        take: 20,
      }),
    ]);

    return {
      mqttConnected: this.mqttPublisher.isConnected(),
      deviceCount: devices.length,
      devices: devices.map((device) => ({
        id: device.id,
        name: device.name,
        ipAddress: device.ipAddress,
        outputs: device.outputs,
        controllerType: device.controllerType,
      })),
      recentCommands: recentLogs.map((log) => ({
        id: log.id,
        action: log.action,
        deviceId: log.deviceId,
        topic: log.mqttTopic,
        status: log.status,
        boxId: log.boxId,
        slotNo: log.slotNo,
        createdAt: log.createdAt,
      })),
    };
  }

  private async executeBoxAction(
    action: 'highlight' | 'off',
    dto: IoBoxCommandDto,
    userId?: number,
  ): Promise<IoCommandResultDto> {
    const plan = await this.resolveBoxPlan(
      dto.boxId,
      action,
      dto.slotNo ?? null,
      dto.slotId ?? null,
    );

    if (!plan) {
      return {
        status: 'warning',
        message: 'No IO mapping configured for this box',
      };
    }

    for (const entry of plan.devices) {
      const outputPins = entry.outputs
        .filter((output) => (action === 'off' ? true : output.state === 1))
        .map((output) => output.pin);

      if (outputPins.length === 0) {
        continue;
      }

      const topicAction = action === 'off' ? 'off' : 'highlight';

      try {
        if (action === 'off') {
          const payload: MqttOffPayload = {
            command: 'off',
            deviceId: entry.deviceId,
            outputs: outputPins,
          };
          await this.mqttPublisher.publishOff(payload);
          await this.logCommand({
            userId,
            deviceId: entry.deviceId,
            action: IoCommandAction.Off,
            topic: topicAction,
            payload,
            boxId: dto.boxId,
            slotNo: dto.slotNo ?? null,
            status: IoCommandStatus.Published,
          });
          this.highlightGateway.emitIoStatus({
            topic: this.mqttConfig.offTopic(entry.deviceId),
            payload,
            deviceId: entry.deviceId,
            timestamp: new Date().toISOString(),
          });
        } else {
          const payload: MqttHighlightPayload = {
            command: 'highlight',
            deviceId: entry.deviceId,
            boxId: dto.boxId,
            slotId: plan.location.slotId,
            outputs: outputPins,
          };
          await this.mqttPublisher.publishHighlight(payload);
          await this.logCommand({
            userId,
            deviceId: entry.deviceId,
            action: IoCommandAction.Highlight,
            topic: topicAction,
            payload,
            boxId: dto.boxId,
            slotNo: dto.slotNo ?? null,
            status: IoCommandStatus.Published,
          });
          this.highlightGateway.emitIoStatus({
            topic: this.mqttConfig.highlightTopic(entry.deviceId),
            payload,
            deviceId: entry.deviceId,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'MQTT publish failed';

        await this.logCommand({
          userId,
          deviceId: entry.deviceId,
          action:
            action === 'off' ? IoCommandAction.Off : IoCommandAction.Highlight,
          topic: topicAction,
          payload: {
            command: action,
            deviceId: entry.deviceId,
            boxId: dto.boxId,
            outputs: outputPins,
          },
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
      const topicPrefix = this.mqttConfig.topicPrefix;
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

      await this.auditService.log({
        action: `mqtt_${params.action}`,
        category: AuditCategory.Mqtt,
        userId: params.userId ?? null,
        resourceType: 'device',
        resourceId: params.deviceId != null ? String(params.deviceId) : null,
        details: {
          topic: mqttTopic,
          boxId: params.boxId,
          slotNo: params.slotNo,
          status: params.status,
        },
        status:
          params.status === IoCommandStatus.Published
            ? AuditStatus.Success
            : AuditStatus.Failure,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write io_command_logs: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
