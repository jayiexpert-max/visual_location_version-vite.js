import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reservation_list')
export class ReservationList {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'res_no', type: 'varchar', length: 50, nullable: true, unique: true })
  resNo: string | null;

  @Column({ name: 'req_date', type: 'datetime', nullable: true })
  reqDate: Date | null;

  @Column({ name: 'store', type: 'varchar', length: 50, nullable: true })
  store: string | null;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Pending' })
  status: string;

  @UpdateDateColumn({ name: 'last_update', type: 'timestamp', nullable: true })
  lastUpdate: Date | null;
}
