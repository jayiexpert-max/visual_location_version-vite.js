import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditCategory {
  Auth = 'auth',
  Inventory = 'inventory',
  User = 'user',
  System = 'system',
  Mqtt = 'mqtt',
  Io = 'io',
  Report = 'report',
  Warehouse = 'warehouse',
}

export enum AuditStatus {
  Success = 'success',
  Failure = 'failure',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'username', type: 'varchar', length: 100, nullable: true })
  username: string | null;

  @Column({ name: 'action', type: 'varchar', length: 64 })
  action: string;

  @Column({
    name: 'category',
    type: 'enum',
    enum: AuditCategory,
    default: AuditCategory.System,
  })
  category: AuditCategory;

  @Column({ name: 'resource_type', type: 'varchar', length: 64, nullable: true })
  resourceType: string | null;

  @Column({ name: 'resource_id', type: 'varchar', length: 64, nullable: true })
  resourceId: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ name: 'details_json', type: 'json', nullable: true })
  detailsJson: Record<string, unknown> | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: AuditStatus,
    default: AuditStatus.Success,
  })
  status: AuditStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
