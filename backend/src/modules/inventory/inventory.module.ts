import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryReceive } from '../../entities/inventory-receive.entity';
import { Product } from '../../entities/product.entity';
import { StockLog } from '../../entities/stock-log.entity';
import { CpkModule } from '../cpk/cpk.module';
import { IoModule } from '../io/io.module';
import { PdserviceModule } from '../pdservice/pdservice.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TvModule } from '../tv/tv.module';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryReceiveRepository } from './repositories/inventory-receive.repository';
import { InventoryProductRepository } from './repositories/product.repository';
import { StockLogRepository } from './repositories/stock-log.repository';
import { FifoService } from './services/fifo.service';
import { HighlightService } from './services/highlight.service';
import { InventoryLookupService } from './services/inventory-lookup.service';
import { InventoryService } from './services/inventory.service';
import { ReceiveService } from './services/receive.service';
import { SearchResolveService } from './services/search-resolve.service';
import { ExpirationSyncService } from './services/expiration-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryReceive,
      StockLog,
      Product,
    ]),
    WarehouseModule,
    forwardRef(() => CpkModule),
    PdserviceModule,
    TvModule,
    IoModule,
    RealtimeModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryReceiveRepository,
    StockLogRepository,
    InventoryProductRepository,
    InventoryService,
    InventoryLookupService,
    ReceiveService,
    FifoService,
    HighlightService,
    SearchResolveService,
    ExpirationSyncService,
  ],
  exports: [
    InventoryReceiveRepository,
    InventoryProductRepository,
    StockLogRepository,
    InventoryService,
    InventoryLookupService,
    ReceiveService,
    FifoService,
    HighlightService,
    SearchResolveService,
    ExpirationSyncService,
  ],
})
export class InventoryModule {}
