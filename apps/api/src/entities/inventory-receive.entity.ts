import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('inventory_receive')
export class InventoryReceive {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ReceiveDate', type: 'datetime', nullable: true })
  receiveDate: Date | null;

  @Column({ name: 'PUID', type: 'varchar', length: 50, nullable: true, unique: true })
  puid: string | null;

  @Column({ name: 'ReservationNo', type: 'varchar', length: 50, nullable: true })
  reservationNo: string | null;

  @Column({ name: 'IM', type: 'varchar', length: 50, nullable: true })
  im: string | null;

  @Column({ name: 'Customer', type: 'varchar', length: 50, nullable: true })
  customer: string | null;

  @Column({ name: 'HanaPart', type: 'varchar', length: 50, nullable: true })
  hanaPart: string | null;

  @Column({ name: 'Description', type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'MnfPartNo', type: 'varchar', length: 100, nullable: true })
  mnfPartNo: string | null;

  @Column({ name: 'LotNo', type: 'varchar', length: 100, nullable: true })
  lotNo: string | null;

  @Column({ name: 'DateCode', type: 'varchar', length: 50, nullable: true })
  dateCode: string | null;

  @Column({ name: 'BinSize', type: 'varchar', length: 50, nullable: true })
  binSize: string | null;

  @Column({ name: 'Qty', type: 'int', nullable: true })
  qty: number | null;

  @Column({ name: 'QtyRemain', type: 'int', nullable: true })
  qtyRemain: number | null;

  @Column({ name: 'McID', type: 'int', nullable: true })
  mcId: number | null;

  @Column({ name: 'MachineName', type: 'varchar', length: 255, nullable: true })
  machineName: string | null;

  @Column({ name: 'StatusName', type: 'varchar', length: 50, nullable: true })
  statusName: string | null;

  @Column({ name: 'ExpirationDate', type: 'datetime', nullable: true })
  expirationDate: Date | null;

  @Column({ name: 'OldIM', type: 'varchar', length: 50, nullable: true })
  oldIm: string | null;

  @Column({ name: 'Remark', type: 'varchar', length: 255, nullable: true })
  remark: string | null;

  @Column({ name: 'Loc_Shelf', type: 'varchar', length: 50, nullable: true })
  locShelf: string | null;

  @Column({ name: 'Loc_Level', type: 'varchar', length: 50, nullable: true })
  locLevel: string | null;

  @Column({ name: 'Loc_Box', type: 'varchar', length: 50, nullable: true })
  locBox: string | null;

  @Column({ name: 'ExpireDate_RoomTemp', type: 'datetime', nullable: true })
  expireDateRoomTemp: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
