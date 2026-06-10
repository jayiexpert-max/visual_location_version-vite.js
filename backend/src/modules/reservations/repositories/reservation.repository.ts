import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservationList } from '../../../entities/reservation-list.entity';

@Injectable()
export class ReservationRepository {
  constructor(
    @InjectRepository(ReservationList)
    private readonly repository: Repository<ReservationList>,
  ) {}

  findAll(): Promise<ReservationList[]> {
    return this.repository.find({
      order: { reqDate: 'DESC', id: 'DESC' },
    });
  }

  findByResNo(resNo: string): Promise<ReservationList | null> {
    return this.repository.findOne({ where: { resNo } });
  }
}
