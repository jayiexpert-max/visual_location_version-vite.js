import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EthernetIo } from './ethernet-io.entity';

export enum RaspberryDeviceStatus {
  Online = 'online',
  Offline = 'offline',
  Unknown = 'unknown',
}

@Entity('raspberry_devices')
export class RaspberryDevice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'device_id', type: 'int', unique: true })
  deviceId: number;

  @Column({ name: 'ethernet_io_id', type: 'int', nullable: true })
  ethernetIoId: number | null;

  @Column({ name: 'hostname', type: 'varchar', length: 100, nullable: true })
  hostname: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'mac_address', type: 'varchar', length: 50, nullable: true })
  macAddress: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: RaspberryDeviceStatus,
    default: RaspberryDeviceStatus.Unknown,
  })
  status: RaspberryDeviceStatus;

  @Column({ name: 'last_heartbeat_at', type: 'datetime', nullable: true })
  lastHeartbeatAt: Date | null;

  @Column({ name: 'output_count', type: 'int', default: 16 })
  outputCount: number;

  @Column({
    name: 'firmware_version',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  firmwareVersion: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => EthernetIo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ethernet_io_id' })
  ethernetIo: EthernetIo | null;
}
