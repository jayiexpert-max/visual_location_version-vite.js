import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum MqttLogDirection {
  Inbound = 'inbound',
  Outbound = 'outbound',
}

export enum MqttLogStatus {
  Received = 'received',
  Published = 'published',
  Failed = 'failed',
}

@Entity('mqtt_logs')
export class MqttLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({
    name: 'direction',
    type: 'enum',
    enum: MqttLogDirection,
  })
  direction: MqttLogDirection;

  @Column({ name: 'topic', type: 'varchar', length: 255 })
  topic: string;

  @Column({ name: 'payload_json', type: 'json' })
  payloadJson: Record<string, unknown>;

  @Column({ name: 'qos', type: 'tinyint', unsigned: true, default: 0 })
  qos: number;

  @Column({ name: 'device_id', type: 'int', nullable: true })
  deviceId: number | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: MqttLogStatus,
  })
  status: MqttLogStatus;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
