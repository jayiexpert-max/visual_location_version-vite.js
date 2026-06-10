import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Box } from './box.entity';
import { Product } from './product.entity';

@Entity('slots')
export class Slot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'box_id', type: 'int', nullable: true })
  boxId: number | null;

  @Column({ name: 'slot_no', type: 'int', nullable: true })
  slotNo: number | null;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark: string | null;

  @ManyToOne(() => Box, (box) => box.slots, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'box_id' })
  box: Box | null;

  @OneToOne(() => Product, (product) => product.slot)
  product: Product | null;
}
