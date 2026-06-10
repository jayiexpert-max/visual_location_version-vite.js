import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryReceive } from '../../entities/inventory-receive.entity';
import { StockLog } from '../../entities/stock-log.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { StockLogRepository } from './stock-log.repository';

@Module({
  imports: [TypeOrmModule.forFeature([StockLog, InventoryReceive])],
  controllers: [ReportsController],
  providers: [StockLogRepository, ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
