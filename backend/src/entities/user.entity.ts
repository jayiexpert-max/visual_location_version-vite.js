import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import { StockLog } from './stock-log.entity';
import { IoCommandLog } from './io-command-log.entity';

export enum UserRole {
  Admin = 'admin',
  User = 'user',
  MaterialPrep = 'material_prep',
}

export enum UserLang {
  Th = 'th',
  En = 'en',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'username', type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ name: 'password', type: 'varchar', length: 255 })
  password: string;

  @Column({
    name: 'role',
    type: 'enum',
    enum: UserRole,
    default: UserRole.User,
  })
  role: UserRole;

  @Column({
    name: 'lang',
    type: 'enum',
    enum: UserLang,
    default: UserLang.Th,
  })
  lang: UserLang;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true, unique: true })
  email: string | null;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark: string | null;

  @Column({ name: 'failed_login_attempts', type: 'int', unsigned: true, default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'datetime', nullable: true })
  lockedUntil: Date | null;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => StockLog, (stockLog) => stockLog.user)
  stockLogs: StockLog[];

  @OneToMany(() => IoCommandLog, (ioCommandLog) => ioCommandLog.user)
  ioCommandLogs: IoCommandLog[];
}
