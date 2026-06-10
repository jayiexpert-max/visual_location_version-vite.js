import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Level } from './level.entity';
import { EthernetIo } from './ethernet-io.entity';
import { Slot } from './slot.entity';

@Entity('boxes')
export class Box {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'level_id', type: 'int', nullable: true })
  levelId: number | null;

  @Column({ name: 'box_code', type: 'varchar', length: 50, nullable: true })
  boxCode: string | null;

  @Column({ name: 'position_in_level', type: 'int', nullable: true })
  positionInLevel: number | null;

  @Column({ name: 'layout', type: 'varchar', length: 10, default: '1x1' })
  layout: string;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark: string | null;

  @Column({ name: 'io_device_id', type: 'int', nullable: true })
  ioDeviceId: number | null;

  @Column({ name: 'io_output_pin', type: 'int', nullable: true })
  ioOutputPin: number | null;

  @ManyToOne(() => Level, (level) => level.boxes, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'level_id' })
  level: Level | null;

  @ManyToOne(() => EthernetIo, (ioDevice) => ioDevice.boxes, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'io_device_id' })
  ioDevice: EthernetIo | null;

  @OneToMany(() => Slot, (slot) => slot.box)
  slots: Slot[];
}
