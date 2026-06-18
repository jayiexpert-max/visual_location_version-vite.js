import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationList } from '../../entities/reservation-list.entity';
import { CpkModule } from '../cpk/cpk.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ReservationsController } from './controllers/reservations.controller';
import { ReservationRepository } from './repositories/reservation.repository';
import { ResInfoService } from './services/res-info.service';
import { ReservationsService } from './services/reservations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReservationList]),
    CpkModule,
    InventoryModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationRepository, ResInfoService, ReservationsService],
  exports: [ReservationsService, ResInfoService],
})
export class ReservationsModule {}
