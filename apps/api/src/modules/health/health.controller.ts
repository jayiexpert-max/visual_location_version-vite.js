import { Controller, Get } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CpkService } from '../cpk/cpk.service';
import { PdserviceService } from '../pdservice/pdservice.service';
import { MqttPublisherService } from '../io/mqtt-publisher.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly cpkService: CpkService,
    private readonly pdserviceService: PdserviceService,
    private readonly mqttPublisherService: MqttPublisherService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Application health check' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      mqttConnected: this.mqttPublisherService.isConnected(),
    };
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
      };
    }
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
    };
  }
}
