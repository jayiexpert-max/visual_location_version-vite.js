import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryReceive } from '../../entities/inventory-receive.entity';
import { Material } from '../../entities/material.entity';
import { CpkModule } from '../cpk/cpk.module';
import { WoBomController } from './wo-bom.controller';
import { WoBomService } from './wo-bom.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryReceive, Material]),
    CpkModule,
  ],
  controllers: [WoBomController],
  providers: [WoBomService],
  exports: [WoBomService],
})
export class WoBomModule {}
