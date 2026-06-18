import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('app_settings_log')
export class AppSettingsLog {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'setting_key', type: 'varchar', length: 64 })
  settingKey: string;

  @Column({ name: 'old_value', type: 'varchar', length: 255, default: '' })
  oldValue: string;

  @Column({ name: 'new_value', type: 'varchar', length: 255, default: '' })
  newValue: string;

  @Column({ name: 'changed_by', type: 'int', nullable: true })
  changedBy: number | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamp' })
  changedAt: Date;
}
