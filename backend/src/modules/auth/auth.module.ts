import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { CpkModule } from '../cpk/cpk.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken]),
    UsersModule,
    CpkModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenRepository],
  exports: [AuthService],
})
export class AuthModule {}
