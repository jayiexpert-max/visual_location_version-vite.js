import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryReceive } from '../../entities/inventory-receive.entity';
import { Product } from '../../entities/product.entity';
import { StockLog } from '../../entities/stock-log.entity';
import { TvHighlight } from '../../entities/tv-highlight.entity';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryReceiveRepository } from './repositories/inventory-receive.repository';
import { InventoryProductRepository } from './repositories/product.repository';
import { StockLogRepository } from './repositories/stock-log.repository';
import { FifoService } from './services/fifo.service';
import { HighlightService } from './services/highlight.service';
import { InventoryService } from './services/inventory.service';
import { ReceiveService } from './services/receive.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryReceive,
      StockLog,
      Product,
      TvHighlight,
    ]),
    WarehouseModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryReceiveRepository,
    StockLogRepository,
    InventoryProductRepository,
    InventoryService,
    ReceiveService,
    FifoService,
    HighlightService,
  ],
  exports: [InventoryService, ReceiveService, FifoService, HighlightService],
})
export class InventoryModule {}
