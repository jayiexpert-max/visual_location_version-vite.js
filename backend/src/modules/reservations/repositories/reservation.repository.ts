import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { ReservationList } from '../../../entities/reservation-list.entity';

@Injectable()
export class ReservationRepository {
  constructor(
    @InjectRepository(ReservationList)
    private readonly repository: Repository<ReservationList>,
  ) {}

  findAll(): Promise<ReservationList[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 2);

    return this.repository.find({
      where: {
        reqDate: MoreThanOrEqual(cutoff),
      },
      order: { reqDate: 'DESC', id: 'DESC' },
    });
  }

  findByResNo(resNo: string): Promise<ReservationList | null> {
    return this.repository.findOne({ where: { resNo } });
  }

  async upsertStatus(resNo: string, status: string): Promise<void> {
    const existing = await this.findByResNo(resNo);
    if (existing) {
      existing.status = status;
      existing.reqDate = existing.reqDate ?? new Date();
      await this.repository.save(existing);
      return;
    }

    await this.repository.save(
      this.repository.create({
        resNo,
        status,
        reqDate: new Date(),
      }),
    );
  }
}
