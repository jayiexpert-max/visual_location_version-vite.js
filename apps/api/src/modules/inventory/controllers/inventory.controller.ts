import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { HighlightDto, HighlightResponseDto } from '../dto/highlight.dto';
import { ReceiveItemDto } from '../dto/receive-item.dto';
import { ReceiveReturnDto } from '../dto/receive-return.dto';
import { SearchQueryDto } from '../dto/search-query.dto';
import { HighlightService } from '../services/highlight.service';
import { InventoryService } from '../services/inventory.service';
import { ReceiveService } from '../services/receive.service';

@ApiTags('inventory')
@ApiBearerAuth('access-token')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly receiveService: ReceiveService,
    private readonly highlightService: HighlightService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search inventory by HanaPart or PUID' })
  search(@Query() query: SearchQueryDto) {
    return this.inventoryService.searchByHanaPartOrPuid(query.q);
  }

  @Get('puid/:puid')
  @ApiOperation({ summary: 'Get inventory receive record by PUID' })
  @ApiParam({ name: 'puid', type: String })
  getByPuid(@Param('puid') puid: string) {
    return this.inventoryService.getByPuid(puid);
  }

  @Post('receive')
  @Roles('admin', 'material_prep')
  @ApiOperation({ summary: 'Receive material into a warehouse slot' })
  receiveItem(
    @Body() dto: ReceiveItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receiveService.receiveItem(dto, user);
  }

  @Post('receive-return')
  @Roles('admin', 'material_prep')
  @ApiOperation({ summary: 'Receive returned material (stub — CPK return deferred)' })
  receiveReturn(
    @Body() dto: ReceiveReturnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receiveService.receiveReturn(dto, user);
  }

  @Post('highlight')
  @ApiOperation({ summary: 'Highlight warehouse location on TV and IO (IO stub)' })
  highlight(
    @Body() dto: HighlightDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HighlightResponseDto> {
    return this.highlightService.buildHighlight(dto, user);
  }
}
