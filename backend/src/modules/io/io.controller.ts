import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { IoBoxCommandDto, IoCommandResultDto, IoTestOutputDto } from './dto/io-command.dto';
import { IoService } from './io.service';

@ApiTags('io')
@ApiBearerAuth('access-token')
@Controller('io')
export class IoController {
  constructor(private readonly ioService: IoService) {}

  @Post('highlight')
  @ApiOperation({ summary: 'Highlight box IO via MQTT' })
  highlight(
    @Body() dto: IoBoxCommandDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<IoCommandResultDto> {
    return this.ioService.highlightBox(dto, user?.id);
  }

  @Post('off')
  @ApiOperation({ summary: 'Turn off box IO via MQTT' })
  off(
    @Body() dto: IoBoxCommandDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<IoCommandResultDto> {
    return this.ioService.offBox(dto, user?.id);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset all mapped IO outputs via MQTT' })
  reset(@CurrentUser() user?: AuthenticatedUser): Promise<IoCommandResultDto> {
    return this.ioService.resetAll(user?.id);
  }

  @Post('test-output')
  @Roles('manage')
  @ApiOperation({ summary: 'Test one configured output pin' })
  testOutput(
    @Body() dto: IoTestOutputDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<IoCommandResultDto> {
    return this.ioService.testOutput(dto, user?.id);
  }

  @Get('status')
  @Roles('admin', 'material_prep', 'user')
  @ApiOperation({ summary: 'IO system status and recent commands' })
  status() {
    return this.ioService.getStatus();
  }

  @Get('devices')
  @Roles('admin', 'material_prep')
  @ApiOperation({ summary: 'List registered Ethernet IO devices' })
  devices() {
    return this.ioService.listDevices();
  }
}
