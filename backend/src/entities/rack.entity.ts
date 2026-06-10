import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EthernetIo } from './ethernet-io.entity';
import { Level } from './level.entity';

@Entity('racks')
export class Rack {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 50, nullable: true })
  name: string | null;

  @Column({ name: 'location_desc', type: 'varchar', length: 255, nullable: true })
  locationDesc: string | null;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark: string | null;

  @Column({ name: 'io_device_id', type: 'int', nullable: true })
  ioDeviceId: number | null;

  @Column({ name: 'io_red_pin', type: 'int', nullable: true })
  ioRedPin: number | null;

  @Column({ name: 'io_yellow_pin', type: 'int', nullable: true })
  ioYellowPin: number | null;

  @Column({ name: 'io_green_pin', type: 'int', nullable: true })
  ioGreenPin: number | null;

  @Column({ name: 'io_buzzer_pin', type: 'int', nullable: true })
  ioBuzzerPin: number | null;

  @ManyToOne(() => EthernetIo, (ioDevice) => ioDevice.racks, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'io_device_id' })
  ioDevice: EthernetIo | null;

  @OneToMany(() => Level, (level) => level.rack)
  levels: Level[];
}
