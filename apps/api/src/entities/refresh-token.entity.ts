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

export enum RefreshTokenDeviceType {
  Desktop = 'desktop',
  Handheld = 'handheld',
  Tv = 'tv',
}

@Entity('refresh_tokens')
@Index('idx_refresh_user_id', ['userId'])
@Index('idx_refresh_expires', ['expiresAt'])
export class RefreshToken {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  @Column({
    name: 'device_type',
    type: 'enum',
    enum: RefreshTokenDeviceType,
    default: RefreshTokenDeviceType.Desktop,
  })
  deviceType: RefreshTokenDeviceType;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.refreshTokens, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
