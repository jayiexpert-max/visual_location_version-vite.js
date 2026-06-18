import { Injectable, NotFoundException } from '@nestjs/common';
import { ReservationList } from '../../../entities/reservation-list.entity';
import { ReservationRepository } from '../repositories/reservation.repository';
import { ResInfoService, type ResInfoResponse } from '../services/res-info.service';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly resInfoService: ResInfoService,
  ) {}

  list(): Promise<ReservationList[]> {
    return this.reservationRepository.findAll();
  }

  async getByResNo(resNo: string): Promise<ReservationList> {
    const reservation = await this.reservationRepository.findByResNo(resNo);

    if (!reservation) {
      throw new NotFoundException({
        message: `Reservation ${resNo} not found`,
        code: 'RESERVATION_NOT_FOUND',
      });
    }

    return reservation;
  }

  getEnrichedDetail(resNo: string): Promise<ResInfoResponse> {
    return this.resInfoService.fetchWithLocal(resNo);
  }
}
