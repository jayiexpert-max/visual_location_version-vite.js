import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  MqttHighlightPayload,
  MqttOffPayload,
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
import type { IoBoxCommandDto, IoCommandResultDto, IoTestOutputDto } from './dto/io-command.dto';

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
    private readonly configService: ConfigService,
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
        slotId: null,
        slotNo: null,
        levelNo: null,
        rackName: '',
        resetAll: true,
      },
      devices,
    };

    await this.executeIoPlan('off', plan, { userId, logAction: IoCommandAction.Reset });
    this.highlightGateway.emitHighlightClear();

    return {
      status: 'success',
      message: `All lights reset (${pinCount} outputs off)`,
      pinCount,
    };
  }

  async testOutput(
    dto: IoTestOutputDto,
    userId?: number,
  ): Promise<IoCommandResultDto> {
    const device = await this.ethernetIoRepository.findOne({
      where: { id: dto.deviceId },
    });

    if (!device) {
      throw new BadRequestException('IO device not found');
    }

    const role = dto.role?.trim() || 'test';
    const plan: IoBoxPlan = {
      location: {
        boxId: 0,
        boxCode: 'TEST',
        slotId: null,
        slotNo: null,
        levelNo: null,
        rackName: 'Admin test',
      },
      devices: [
        {
          deviceId: device.id,
          device,
          outputs: [{ pin: dto.pin, state: 1, role }],
        },
      ],
    };

    await this.executeIoPlan('highlight', plan, {
      userId,
      logAction: IoCommandAction.Highlight,
    });

    return {
      status: 'success',
      message: `Output pin ${dto.pin} test sent`,
      pinCount: 1,
    };
  }

  private get towerOnly(): boolean {
    return this.configService.get<boolean>('io.towerOnly', false);
  }

  private get raspiIoKey(): string {
    return this.configService.get<string>('io.raspiIoKey', '');
  }

  private isRaspiDevice(device: EthernetIo): boolean {
    return device.controllerType?.toLowerCase() === 'raspi';
  }

  private buildRaspiUrl(device: EthernetIo): string {
    const format = device.urlFormat?.trim() || 'http://{IP}:{PORT}/api/io/highlight';
    return format
      .replaceAll('{IP}', device.ipAddress)
      .replaceAll('{PORT}', String(device.port || 8080));
  }

  private async sendRaspiPayload(
    device: EthernetIo,
    payload: Record<string, unknown>,
  ): Promise<{ httpCode: number; responseText: string }> {
    const url = this.buildRaspiUrl(device);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.raspiIoKey.trim()) {
      headers['X-IO-Key'] = this.raspiIoKey.trim();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        let message = `Raspi returned HTTP ${response.status}`;
        try {
          const decoded = JSON.parse(responseText) as { message?: unknown };
          if (decoded?.message) {
            message += `: ${String(decoded.message)}`;
          }
        } catch {
          // Keep HTTP status as the primary error, matching PHP behavior.
        }
        throw new Error(message);
      }
      return { httpCode: response.status, responseText };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Raspi gateway request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private raspiPayload(
    action: 'highlight' | 'off',
    plan: IoBoxPlan,
    entry: IoDevicePlan,
  ): Record<string, unknown> {
    return {
      action: action === 'off' ? 'off' : 'highlight',
      duration_sec: action === 'off' ? 0 : this.mqttConfig.highlightDurationSec,
      device_name: entry.device.name ?? '',
      location: {
        box_id: plan.location.boxId,
        box_code: plan.location.boxCode ?? '',
        slot_no: plan.location.slotNo ?? null,
        level_no: plan.location.levelNo ?? null,
        rack_name: plan.location.rackName ?? '',
        reset_all: plan.location.resetAll === true ? true : undefined,
      },
      outputs: entry.outputs,
    };
  }

  private async executeIoPlan(
    action: 'highlight' | 'off',
    plan: IoBoxPlan,
    options: {
      userId?: number;
      logAction?: IoCommandAction;
      boxId?: number;
      slotNo?: number | null;
    },
  ): Promise<void> {
    for (const entry of plan.devices) {
      const outputPins = entry.outputs
        .filter((output) => (action === 'off' ? true : output.state === 1))
        .map((output) => output.pin);

      if (outputPins.length === 0) {
        continue;
      }

      const topicAction = action === 'off' ? 'off' : 'highlight';
      const logAction =
        options.logAction ??
        (action === 'off' ? IoCommandAction.Off : IoCommandAction.Highlight);
      const targetBoxId = options.boxId ?? plan.location.boxId;
      const targetSlotNo = options.slotNo ?? plan.location.slotNo ?? null;

      try {
        if (this.isRaspiDevice(entry.device)) {
          const payload = this.raspiPayload(action, plan, entry);
          await this.sendRaspiPayload(entry.device, payload);
          await this.logCommand({
            userId: options.userId,
            deviceId: entry.deviceId,
            action: logAction,
            topic: 'raspi',
            payload,
            boxId: targetBoxId || null,
            slotNo: targetSlotNo,
            status: IoCommandStatus.Published,
          });
          this.highlightGateway.emitIoStatus({
            topic: this.buildRaspiUrl(entry.device),
            payload,
            deviceId: entry.deviceId,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        if (action === 'off') {
          const payload: MqttOffPayload = {
            command: 'off',
            deviceId: entry.deviceId,
            outputs: outputPins,
          };
          await this.mqttPublisher.publishOff(payload);
          await this.logCommand({
            userId: options.userId,
            deviceId: entry.deviceId,
            action: logAction,
            topic: topicAction,
            payload,
            boxId: targetBoxId || null,
            slotNo: targetSlotNo,
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
            boxId: plan.location.boxId,
            slotId: plan.location.slotId,
            outputs: outputPins,
          };
          await this.mqttPublisher.publishHighlight(payload);
          await this.logCommand({
            userId: options.userId,
            deviceId: entry.deviceId,
            action: logAction,
            topic: topicAction,
            payload,
            boxId: targetBoxId || null,
            slotNo: targetSlotNo,
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
          error instanceof Error ? error.message : 'IO command failed';

        await this.logCommand({
          userId: options.userId,
          deviceId: entry.deviceId,
          action: logAction,
          topic: this.isRaspiDevice(entry.device) ? 'raspi' : topicAction,
          payload: this.isRaspiDevice(entry.device)
            ? this.raspiPayload(action, plan, entry)
            : {
                command: action,
                deviceId: entry.deviceId,
                boxId: plan.location.boxId,
                outputs: outputPins,
              },
          boxId: targetBoxId || null,
          slotNo: targetSlotNo,
          status: IoCommandStatus.Failed,
          errorMessage: message,
        });

        throw new BadRequestException(message);
      }
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

    if (!this.towerOnly) {
      addOutput(Number(row.box_dev ?? 0), Number(row.box_pin ?? 0), 'box');
    }
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

  async listRaspiGatewayDevices() {
    const devices = await this.ethernetIoRepository.find({
      order: { id: 'ASC' },
    });
    const raspiDevices = devices.filter((device) => this.isRaspiDevice(device));

    return Promise.all(
      raspiDevices.map(async (device) => {
        const health = await this.checkRaspiHealth(device);
        return {
          id: device.id,
          deviceId: device.id,
          name: device.name,
          ipAddress: device.ipAddress,
          port: device.port,
          status: health.status,
          message: health.message,
          healthUrl: health.url,
          lastHeartbeatAt: health.checkedAt,
          outputCount: device.outputs,
          controllerType: device.controllerType,
        };
      }),
    );
  }

  async getStatus() {
    const [devices, raspiGateways, recentLogs] = await Promise.all([
      this.listDevices(),
      this.listRaspiGatewayDevices(),
      this.ioCommandLogRepository.find({
        order: { createdAt: 'DESC' },
        take: 20,
      }),
    ]);

    return {
      mqttConnected: this.mqttPublisher.isConnected(),
      deviceCount: devices.length,
      raspiGateways,
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

  private raspiHealthUrl(device: EthernetIo): string {
    const commandUrl = this.buildRaspiUrl(device);
    try {
      const url = new URL(commandUrl);
      url.pathname = '/health';
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch {
      return `http://${device.ipAddress}:${device.port || 8080}/health`;
    }
  }

  private async checkRaspiHealth(
    device: EthernetIo,
  ): Promise<{
    status: 'online' | 'offline';
    message: string;
    url: string;
    checkedAt: string;
  }> {
    const url = this.raspiHealthUrl(device);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.raspiIoKey.trim()) {
      headers['X-IO-Key'] = this.raspiIoKey.trim();
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const checkedAt = new Date().toISOString();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      const raw = await response.text();
      if (!response.ok) {
        return {
          status: 'offline',
          message: `HTTP ${response.status}`,
          url,
          checkedAt,
        };
      }
      let service = 'Raspi gateway online';
      try {
        const decoded = JSON.parse(raw) as { service?: unknown; status?: unknown };
        service = String(decoded.service ?? decoded.status ?? service);
      } catch {
        // Plain response is still acceptable if HTTP 2xx.
      }
      return { status: 'online', message: service, url, checkedAt };
    } catch (error) {
      return {
        status: 'offline',
        message:
          error instanceof Error && error.name === 'AbortError'
            ? 'Health check timed out'
            : error instanceof Error
              ? error.message
              : 'Health check failed',
        url,
        checkedAt,
      };
    } finally {
      clearTimeout(timeout);
    }
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

    await this.executeIoPlan(action, plan, {
      userId,
      boxId: dto.boxId,
      slotNo: dto.slotNo ?? null,
    });

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
