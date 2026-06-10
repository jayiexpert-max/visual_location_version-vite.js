import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TvKiosk } from '../../common/decorators/tv-kiosk.decorator';
import { SetTvHighlightDto, TvHighlightResponseDto } from './dto/tv-highlight.dto';
import { TvService } from './tv.service';

@ApiTags('tv')
@Controller('tv')
export class TvController {
  constructor(private readonly tvService: TvService) {}

  @Get('highlight')
  @TvKiosk()
  @ApiOperation({ summary: 'Get active TV highlight (JWT or TV kiosk key)' })
  @ApiBearerAuth('access-token')
  @ApiSecurity('tv-kiosk-key')
  getHighlight(): Promise<TvHighlightResponseDto | null> {
    return this.tvService.getHighlight();
  }

  @Post('highlight')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Set TV highlight and emit Socket.IO event' })
  setHighlight(
    @Body() dto: SetTvHighlightDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<TvHighlightResponseDto> {
    return this.tvService.setHighlight(dto, user?.username);
  }

  @Delete('highlight')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Clear TV highlight and emit Socket.IO event' })
  async clearHighlight(): Promise<{ cleared: true }> {
    await this.tvService.clearHighlight();
    return { cleared: true };
  }
}
