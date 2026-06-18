import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('app_settings')
export class AppSetting {
  @PrimaryColumn({ name: 'setting_key', type: 'varchar', length: 64 })
  settingKey: string;

  @Column({ name: 'setting_value', type: 'varchar', length: 255, default: '' })
  settingValue: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;
}
