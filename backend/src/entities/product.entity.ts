import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Slot } from './slot.entity';
import { StockLog } from './stock-log.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'slot_id', type: 'int', nullable: true })
  slotId: number | null;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ name: 'qty', type: 'int', default: 0 })
  qty: number;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark: string | null;

  @ManyToOne(() => Slot, (slot) => slot.product, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'slot_id' })
  slot: Slot | null;

  @OneToMany(() => StockLog, (stockLog) => stockLog.product)
  stockLogs: StockLog[];
}
