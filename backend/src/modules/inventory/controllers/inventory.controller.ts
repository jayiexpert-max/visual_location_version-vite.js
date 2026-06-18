import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { TvKiosk } from '../../../common/decorators/tv-kiosk.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { HighlightDto, HighlightResponseDto } from '../dto/highlight.dto';
import { ReceiveItemDto } from '../dto/receive-item.dto';
import { AddStockDto } from '../dto/add-stock.dto';
import { SearchQueryDto } from '../dto/search-query.dto';
import { SyncExpirationDto, UpdateExpirationDto } from '../dto/expiration-sync.dto';
import { ExpirationSyncService } from '../services/expiration-sync.service';
import { HighlightService } from '../services/highlight.service';
import { InventoryLookupService } from '../services/inventory-lookup.service';
import { InventoryService } from '../services/inventory.service';
import { ReceiveService } from '../services/receive.service';
import { SearchResolveService } from '../services/search-resolve.service';

@ApiTags('inventory')
@ApiBearerAuth('access-token')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly inventoryLookupService: InventoryLookupService,
    private readonly receiveService: ReceiveService,
    private readonly highlightService: HighlightService,
    private readonly searchResolveService: SearchResolveService,
    private readonly expirationSyncService: ExpirationSyncService,
  ) {}

  @Get('lookup')
  @ApiOperation({ summary: 'Lookup PUID metadata and warehouse location (PDService + local fallback)' })
  @ApiQuery({ name: 'puid', required: true })
  @ApiQuery({ name: 'hanaPart', required: false })
  lookup(
    @Query('puid') puid: string,
    @Query('hanaPart') hanaPart?: string,
  ) {
    return this.inventoryLookupService.lookupByPuid(puid, hanaPart);
  }

  @Get('search-resolve')
  @TvKiosk()
  @ApiOperation({ summary: 'Resolve HanaPart or PUID to warehouse location (search_product.php)' })
  @ApiQuery({ name: 'q', required: true })
  searchResolve(@Query('q') q: string) {
    return this.searchResolveService.resolve(q);
  }

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

  @Post('expiration/sync')
  @ApiOperation({ summary: 'Sync expiration from CPK central (station or RES scope)' })
  syncExpiration(@Body() dto: SyncExpirationDto) {
    return this.expirationSyncService.syncFromCentral(
      dto.search ?? '',
      dto.resNo ?? '',
    );
  }

  @Get('expiration/res-options')
  @ApiOperation({ summary: 'RES numbers for expiration sync filter datalist' })
  listExpirationResOptions() {
    return this.expirationSyncService.listResOptions();
  }

  @Get('expiration/res-sync-list')
  @ApiOperation({ summary: 'RES cards for per-RES expiration sync' })
  listExpirationResSyncList(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('resNo') resNo?: string,
  ) {
    return this.expirationSyncService.listResSyncList(
      search ?? '',
      status ?? 'all',
      resNo ?? '',
    );
  }

  @Patch(':puid/expiration')
  @ApiOperation({ summary: 'Refresh PUID expiration from PDService (update_expiration.php)' })
  @ApiParam({ name: 'puid', type: String })
  updateExpiration(
    @Param('puid') puid: string,
    @Body() dto: UpdateExpirationDto,
  ) {
    return this.expirationSyncService.updateExpirationFromPdservice(puid, dto.id);
  }

  @Post('receive')
  @Roles('admin', 'manage', 'material_prep')
  @ApiOperation({ summary: 'Receive material into a warehouse slot' })
  receiveItem(
    @Body() dto: ReceiveItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receiveService.receiveItem(dto, user);
  }

  @Post('receive-return')
  @Roles('admin', 'manage', 'material_prep')
  @ApiOperation({ summary: 'Material inbound (add_stock.php parity)' })
  addStock(
    @Body() dto: AddStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receiveService.addStock(dto, user);
  }

  @Post('highlight')
  @ApiOperation({ summary: 'Highlight warehouse location on TV and Ethernet IO' })
  highlight(
    @Body() dto: HighlightDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HighlightResponseDto> {
    return this.highlightService.buildHighlight(dto, user);
  }
}
