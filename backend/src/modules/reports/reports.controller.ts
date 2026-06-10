import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { StockMovementsFilterDto } from './dto/stock-movements-filter.dto';
import { ExpirationReportFilterDto } from './dto/expiration-report-filter.dto';
import { InventoryReceiveFilterDto } from './dto/inventory-receive-filter.dto';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stock-movements')
  @ApiOperation({ summary: 'Paginated stock movement history' })
  stockMovements(@Query() filters: StockMovementsFilterDto) {
    return this.reportsService.stockMovements(filters);
  }

  @Get('expiration')
  @ApiOperation({ summary: 'Paginated expiration report' })
  expiration(@Query() filters: ExpirationReportFilterDto) {
    return this.reportsService.expirationReport(filters);
  }

  @Get('inventory-receive')
  @ApiOperation({ summary: 'Paginated inventory receive list' })
  inventoryReceive(@Query() filters: InventoryReceiveFilterDto) {
    return this.reportsService.inventoryReceiveList(filters);
  }
}
