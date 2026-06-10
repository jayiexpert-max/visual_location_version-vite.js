import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationList } from '../../entities/reservation-list.entity';
import { ReservationsController } from './controllers/reservations.controller';
import { ReservationRepository } from './repositories/reservation.repository';
import { ReservationsService } from './services/reservations.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationList])],
  controllers: [ReservationsController],
  providers: [ReservationRepository, ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
