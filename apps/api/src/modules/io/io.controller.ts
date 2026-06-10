import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { IoBoxCommandDto, IoCommandResultDto } from './dto/io-command.dto';
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
}
