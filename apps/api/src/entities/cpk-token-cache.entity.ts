import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cpk_token_cache')
export class CpkTokenCache {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ name: 'public_uid', type: 'varchar', length: 64 })
  publicUid: string;

  @Column({ name: 'expired_at', type: 'datetime' })
  expiredAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
