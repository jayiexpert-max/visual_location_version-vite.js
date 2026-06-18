import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CpkService } from '../cpk/cpk.service';
import { PdserviceService } from '../pdservice/pdservice.service';
import { MqttHealthService } from '../mqtt/mqtt-health.service';
import { IoService } from '../io/io.service';
import { HighlightGateway } from '../realtime/highlight.gateway';
import { CpkEndpointHealthService } from './cpk-endpoint-health.service';
import { DatabaseHealthService } from './database-health.service';
import { SystemMetricsService } from './system-metrics.service';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly cpkService: CpkService,
    private readonly pdserviceService: PdserviceService,
    private readonly mqttHealthService: MqttHealthService,
    private readonly ioService: IoService,
    private readonly databaseHealthService: DatabaseHealthService,
    private readonly cpkEndpointHealthService: CpkEndpointHealthService,
    private readonly systemMetricsService: SystemMetricsService,
    private readonly highlightGateway: HighlightGateway,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Application health check' })
  async check() {
    const [db, mqtt] = await Promise.all([
      this.databaseHealthService.check(),
      this.mqttHealthService.getMqttHealth(),
    ]);

    const healthy = db.status === 'ok';

    return {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: db.status,
      mqttConnected: mqtt.connected,
      uptimeSec: Math.round(process.uptime()),
    };
  }

  @Public()
  @Get('database')
  @ApiOperation({ summary: 'Database connectivity check' })
  database() {
    return this.databaseHealthService.check();
  }

  @Public()
  @Get('mqtt')
  @ApiOperation({ summary: 'MQTT broker health' })
  mqtt() {
    return this.mqttHealthService.getMqttHealth();
  }

  @Public()
  @Get('raspi')
  @ApiOperation({ summary: 'Raspberry Pi device health' })
  raspi() {
    return this.mqttHealthService.getRaspiHealth();
  }

  @Public()
  @Get('io')
  @ApiOperation({ summary: 'IO / Ethernet output subsystem health' })
  async io() {
    const [ioHealth, status] = await Promise.all([
      this.mqttHealthService.getIoHealth(),
      this.ioService.getStatus(),
    ]);

    return {
      ...ioHealth,
      devices: status.devices,
    };
  }

  @Public()
  @Get('socketio')
  @ApiOperation({ summary: 'Socket.IO gateway status' })
  socketio() {
    return {
      status: 'ok',
      namespace: '/realtime',
      activeConnections: this.highlightGateway.getActiveConnectionCount(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('system')
  @ApiOperation({ summary: 'Host system metrics (memory, CPU load)' })
  system() {
    return this.systemMetricsService.getMetrics();
  }

  @Public()
  @Get('cpk')
  @ApiOperation({ summary: 'CPK service connectivity check' })
  async cpk() {
    const startedAt = Date.now();

    try {
      const data = await this.cpkService.getVersion();
      return {
        status: 'ok',
        latencyMs: Date.now() - startedAt,
        data,
      };
    } catch (error) {
      return {
        status: 'error',
        latencyMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'CPK unreachable',
        code: 'CPK_UNAVAILABLE',
      };
    }
  }

  @Public()
  @Get('cpk/endpoints')
  @ApiOperation({ summary: 'CPK endpoint latency checks' })
  cpkEndpoints() {
    return this.cpkEndpointHealthService.checkAll();
  }

  @Public()
  @Get('pdservice')
  @ApiOperation({ summary: 'PDService connectivity check' })
  async pdservice() {
    const startedAt = Date.now();
    const result = await this.pdserviceService.healthCheck();

    return {
      status: result.ok ? 'ok' : 'error',
      latencyMs: Date.now() - startedAt,
      httpCode: result.httpCode,
      message: result.message,
      code: result.ok ? undefined : 'PDSERVICE_UNAVAILABLE',
    };
  }

  @Public()
  @Get('dashboard')
  @ApiOperation({ summary: 'Combined system health dashboard snapshot' })
  async dashboard() {
    const [database, mqtt, raspi, io, cpk, pdservice, socketio, system] =
      await Promise.all([
        this.databaseHealthService.check(),
        this.mqttHealthService.getMqttHealth(),
        this.mqttHealthService.getRaspiHealth(),
        this.io(),
        this.cpk(),
        this.pdservice(),
        Promise.resolve(this.socketio()),
        Promise.resolve(this.systemMetricsService.getMetrics()),
      ]);

    const checks = [database, mqtt, raspi, io, cpk, pdservice, socketio];
    const allOk = checks.every(
      (c) => (c as { status?: string }).status === 'ok' || (c as { connected?: boolean }).connected === true,
    );

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database,
      nestjs: { status: 'ok', uptimeSec: Math.round(process.uptime()) },
      mqtt,
      raspi,
      io,
      cpk,
      pdservice,
      socketio,
      system,
    };
  }
}
