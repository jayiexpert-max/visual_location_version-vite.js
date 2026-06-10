import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { EthernetIo } from './ethernet-io.entity';

export enum IoCommandAction {
  Highlight = 'highlight',
  Off = 'off',
  Reset = 'reset',
}

export enum IoCommandStatus {
  Published = 'published',
  Failed = 'failed',
}

@Entity('io_command_logs')
@Index('idx_io_log_created', ['createdAt'])
@Index('idx_io_log_device', ['deviceId'])
@Index('idx_io_log_box', ['boxId'])
export class IoCommandLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'device_id', type: 'int', nullable: true })
  deviceId: number | null;

  @Column({
    name: 'action',
    type: 'enum',
    enum: IoCommandAction,
  })
  action: IoCommandAction;

  @Column({ name: 'mqtt_topic', type: 'varchar', length: 255 })
  mqttTopic: string;

  @Column({ name: 'payload_json', type: 'json' })
  payloadJson: Record<string, unknown>;

  @Column({ name: 'box_id', type: 'int', nullable: true })
  boxId: number | null;

  @Column({ name: 'slot_no', type: 'int', nullable: true })
  slotNo: number | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: IoCommandStatus,
    default: IoCommandStatus.Published,
  })
  status: IoCommandStatus;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.ioCommandLogs, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @ManyToOne(() => EthernetIo, (device) => device.ioCommandLogs, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'device_id' })
  device: EthernetIo | null;
}
