import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Rack } from './rack.entity';
import { Box } from './box.entity';
import { IoCommandLog } from './io-command-log.entity';

@Entity('ethernet_ios')
export class EthernetIo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 50 })
  ipAddress: string;

  @Column({ name: 'port', type: 'int', default: 80 })
  port: number;

  @Column({ name: 'controller_type', type: 'varchar', length: 50, default: 'http' })
  controllerType: string;

  @Column({
    name: 'url_format',
    type: 'varchar',
    length: 255,
    default: 'http://{IP}:{PORT}/relay.cgi?relay={PIN}&state={STATE}',
  })
  urlFormat: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'inputs', type: 'int', default: 16 })
  inputs: number;

  @Column({ name: 'outputs', type: 'int', default: 16 })
  outputs: number;

  @OneToMany(() => Rack, (rack) => rack.ioDevice)
  racks: Rack[];

  @OneToMany(() => Box, (box) => box.ioDevice)
  boxes: Box[];

  @OneToMany(() => IoCommandLog, (ioCommandLog) => ioCommandLog.device)
  ioCommandLogs: IoCommandLog[];
}
