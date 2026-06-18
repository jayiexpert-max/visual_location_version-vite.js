import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AuditCategory, AuditStatus } from '../../entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
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
import { CpkTokenService } from '../cpk/cpk-token.service';

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

export interface AuthRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private static readonly SHIFT_LOGOUT_CODE = 'SHIFT_LOGOUT_REQUIRED';
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly cpkTokenService: CpkTokenService,
  ) {}

  async login(
    dto: LoginDto,
    context: AuthRequestContext = {},
  ): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByUsername(dto.username);

    if (!user) {
      await this.auditService.log({
        action: 'login_failed',
        category: AuditCategory.Auth,
        username: dto.username,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        status: AuditStatus.Failure,
        details: { reason: 'user_not_found' },
      });
      throw new UnauthorizedException({
        message: 'Invalid username or password',
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
      });
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await this.auditService.log({
        action: 'login_blocked',
        category: AuditCategory.Auth,
        userId: user.id,
        username: user.username,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        status: AuditStatus.Failure,
        details: { lockedUntil: user.lockedUntil.toISOString() },
      });
      throw new UnauthorizedException({
        message: 'Account is temporarily locked. Please try again later.',
        code: ErrorCodes.AUTH_ACCOUNT_LOCKED,
      });
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      normalizePhpBcryptHash(user.password),
    );

    if (!passwordMatches) {
      await this.handleFailedLogin(user, context);
      throw new UnauthorizedException({
        message: 'Invalid username or password',
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
      });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);
    await this.refreshTokenRepository.revokeAllForUser(user.id);

    const response = await this.issueAuthResponse(user, dto.deviceType);

    await this.auditService.log({
      action: 'login',
      category: AuditCategory.Auth,
      userId: user.id,
      username: user.username,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      details: { deviceType: dto.deviceType },
    });

    this.prewarmCpkPublicUid();

    return response;
  }

  /** Non-blocking — mirrors PHP cpk_clear_public_uid_cache + cpk_prewarm_public_uid on login. */
  private prewarmCpkPublicUid(): void {
    void (async () => {
      try {
        await this.cpkTokenService.clearCache();
        await this.cpkTokenService.getPublicUid(true);
      } catch (err) {
        this.logger.debug(
          `CPK prewarm after login skipped: ${err instanceof Error ? err.message : err}`,
        );
      }
    })();
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

  async logout(
    refreshToken: string,
    context: AuthRequestContext & { userId?: number; username?: string } = {},
  ): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepository.revokeByHash(tokenHash);

    await this.auditService.log({
      action: 'logout',
      category: AuditCategory.Auth,
      userId: context.userId ?? null,
      username: context.username ?? null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });
  }

  private async handleFailedLogin(
    user: User,
    context: AuthRequestContext,
  ): Promise<void> {
    const maxAttempts = this.configService.get<number>(
      'security.maxFailedLoginAttempts',
      5,
    );
    const lockoutMinutes = this.configService.get<number>(
      'security.lockoutDurationMinutes',
      15,
    );

    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= maxAttempts) {
      user.lockedUntil = new Date(Date.now() + lockoutMinutes * 60_000);
    }

    await this.userRepository.save(user);

    await this.auditService.log({
      action: 'login_failed',
      category: AuditCategory.Auth,
      userId: user.id,
      username: user.username,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      status: AuditStatus.Failure,
      details: {
        attempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil?.toISOString() ?? null,
      },
    });
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

/** PHP password_hash() emits $2y$; Node bcrypt expects $2a$ / $2b$. */
function normalizePhpBcryptHash(hash: string): string {
  if (hash.startsWith('$2y$')) {
    return `$2a$${hash.slice(4)}`;
  }
  return hash;
}
