import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Box } from '../../entities/box.entity';
import { EthernetIo } from '../../entities/ethernet-io.entity';
import { Level } from '../../entities/level.entity';
import { Product } from '../../entities/product.entity';
import { Rack } from '../../entities/rack.entity';
import { Slot } from '../../entities/slot.entity';
import {
  IoDevicesAdminController,
  WarehouseAdminController,
} from './controllers/warehouse-admin.controller';
import { WarehouseController } from './controllers/warehouse.controller';
import { BoxRepository } from './repositories/box.repository';
import { EthernetIoRepository } from './repositories/ethernet-io.repository';
import { LevelRepository } from './repositories/level.repository';
import { ProductRepository } from './repositories/product.repository';
import { RackRepository } from './repositories/rack.repository';
import { SlotRepository } from './repositories/slot.repository';
import { BoxLayoutService } from './services/box-layout.service';
import { IoDeviceService } from './services/io-device.service';
import { WarehouseService } from './services/warehouse.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rack, Level, Box, Slot, Product, EthernetIo]),
  ],
  controllers: [
    WarehouseController,
    WarehouseAdminController,
    IoDevicesAdminController,
  ],
  providers: [
    RackRepository,
    LevelRepository,
    BoxRepository,
    SlotRepository,
    ProductRepository,
    EthernetIoRepository,
    WarehouseService,
    BoxLayoutService,
    IoDeviceService,
  ],
  exports: [
    WarehouseService,
    BoxLayoutService,
    ProductRepository,
    BoxRepository,
    SlotRepository,
    RackRepository,
  ],
})
export class WarehouseModule {}
