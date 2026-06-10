import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import type { DeviceType } from '../../config/configuration';
import { addDuration, durationToSeconds } from '../../common/utils/duration.util';
import {
  isIssuedBeforeLastShiftCutoff,
  type ShiftLogoutConfig,
} from '../../common/utils/shift-logout.util';
import { User } from '../../entities/user.entity';
import { RefreshTokenDeviceType } from '../../entities/refresh-token.entity';
import { UserRepository } from '../users/repositories/user.repository';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UpdateMeDto } from './dto/update-me.dto';

interface AccessTokenPayload {
  sub: number;
  username: string;
  role: string;
  deviceType: DeviceType;
  lang: string;
}

interface RefreshTokenPayload {
  sub: number;
  jti: string;
  deviceType: DeviceType;
}

@Injectable()
export class AuthService {
  private static readonly SHIFT_LOGOUT_CODE = 'SHIFT_LOGOUT_REQUIRED';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByUsername(dto.username);
    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid username or password',
        code: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException({
        message: 'Invalid username or password',
        code: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    await this.refreshTokenRepository.revokeAllForUser(user.id);

    return this.issueAuthResponse(user, dto.deviceType);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        },
      );
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid or expired refresh token',
        code: 'AUTH_INVALID_REFRESH_TOKEN',
      });
    }

    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findValidByHash(
      tokenHash,
    );

    if (!storedToken || storedToken.userId !== payload.sub) {
      throw new UnauthorizedException({
        message: 'Invalid or expired refresh token',
        code: 'AUTH_INVALID_REFRESH_TOKEN',
      });
    }

    this.assertSessionValidForShift(storedToken.createdAt);

    await this.refreshTokenRepository.revokeByHash(tokenHash);

    const user = storedToken.user ?? (await this.userRepository.findById(payload.sub));
    if (!user) {
      throw new UnauthorizedException({
        message: 'User no longer exists',
        code: 'AUTH_USER_NOT_FOUND',
      });
    }

    return this.issueAuthResponse(user, storedToken.deviceType);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepository.revokeByHash(tokenHash);
  }

  async getMe(userId: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        message: 'User no longer exists',
        code: 'AUTH_USER_NOT_FOUND',
      });
    }

    return UserResponseDto.fromEntity(user);
  }

  async updateMe(userId: number, dto: UpdateMeDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        message: 'User no longer exists',
        code: 'AUTH_USER_NOT_FOUND',
      });
    }

    if (dto.lang !== undefined) {
      user.lang = dto.lang;
      await this.userRepository.save(user);
    }

    return UserResponseDto.fromEntity(user);
  }

  assertSessionValidForShift(issuedAt: Date): void {
    const shiftConfig = this.getShiftLogoutConfig();
    if (isIssuedBeforeLastShiftCutoff(issuedAt, shiftConfig)) {
      throw new UnauthorizedException({
        message:
          'Session expired due to shift change. Please log in again.',
        code: AuthService.SHIFT_LOGOUT_CODE,
      });
    }
  }

  private async issueAuthResponse(
    user: User,
    deviceType: RefreshTokenDeviceType,
  ): Promise<AuthResponseDto> {
    const accessExpiresIn = this.getAccessExpiresIn(deviceType);
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );

    const accessToken = await this.signAccessToken(user, deviceType, accessExpiresIn);
    const refreshToken = await this.createRefreshToken(
      user,
      deviceType,
      refreshExpiresIn,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: durationToSeconds(accessExpiresIn),
      user: UserResponseDto.fromEntity(user),
    };
  }

  private async signAccessToken(
    user: User,
    deviceType: RefreshTokenDeviceType,
    expiresIn: string,
  ): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      deviceType,
      lang: user.lang,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
  }

  private async createRefreshToken(
    user: User,
    deviceType: RefreshTokenDeviceType,
    expiresIn: string,
  ): Promise<string> {
    const jti = randomUUID();
    const payload: RefreshTokenPayload = {
      sub: user.id,
      jti,
      deviceType,
    };

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const expiresAt = addDuration(new Date(), expiresIn);
    await this.refreshTokenRepository.createToken({
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      deviceType,
      expiresAt,
    });

    return refreshToken;
  }

  private getAccessExpiresIn(deviceType: RefreshTokenDeviceType): string {
    if (deviceType === RefreshTokenDeviceType.Handheld) {
      return this.configService.getOrThrow<string>(
        'jwt.handheldAccessExpiresIn',
      );
    }

    return this.configService.getOrThrow<string>('jwt.desktopAccessExpiresIn');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getShiftLogoutConfig(): ShiftLogoutConfig {
    return {
      enabled: this.configService.get<boolean>('jwt.shiftLogoutEnabled', true),
      morningCutoff: this.configService.get<string>(
        'jwt.shiftCutoffMorning',
        '07:00',
      ),
      eveningCutoff: this.configService.get<string>(
        'jwt.shiftCutoffEvening',
        '19:00',
      ),
    };
  }

}
