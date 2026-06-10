import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TvKiosk } from '../../../common/decorators/tv-kiosk.decorator';
import { BoxLayoutResponseDto } from '../dto/box-layout-response.dto';
import { WarehouseHierarchyResponseDto } from '../dto/warehouse-hierarchy-response.dto';
import { BoxLayoutService } from '../services/box-layout.service';
import { WarehouseService } from '../services/warehouse.service';

@ApiTags('warehouse')
@ApiBearerAuth('access-token')
@Controller('warehouse')
export class WarehouseController {
  constructor(
    private readonly warehouseService: WarehouseService,
    private readonly boxLayoutService: BoxLayoutService,
  ) {}

  @Get('hierarchy')
  @TvKiosk()
  @ApiOperation({ summary: 'Get full warehouse rack/level/box/slot hierarchy' })
  getHierarchy(): Promise<WarehouseHierarchyResponseDto> {
    return this.warehouseService.getHierarchy();
  }

  @Get('racks')
  @ApiOperation({ summary: 'List all racks' })
  listRacks() {
    return this.warehouseService.findAllRacks();
  }

  @Get('racks/:id')
  @ApiOperation({ summary: 'Get rack details with levels, boxes, and slots' })
  @ApiParam({ name: 'id', type: Number })
  getRackDetails(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.getRackDetails(id);
  }

  @Get('boxes/:id/layout')
  @TvKiosk()
  @ApiOperation({ summary: 'Get box slot grid layout' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({
    name: 'highlightSlotId',
    required: false,
    type: Number,
    description: 'Slot ID to highlight in the grid',
  })
  getBoxLayout(
    @Param('id', ParseIntPipe) id: number,
    @Query('highlightSlotId', new ParseIntPipe({ optional: true }))
    highlightSlotId?: number,
  ): Promise<BoxLayoutResponseDto> {
    return this.boxLayoutService.getBoxLayout(id, highlightSlotId);
  }

  @Get('boxes/:id/products')
  @ApiOperation({ summary: 'List products stored in a box' })
  @ApiParam({ name: 'id', type: Number })
  getBoxProducts(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.getBoxProducts(id);
  }
}
