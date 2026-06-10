import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { SupportedLanguage, UserRole } from '@visual-location/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TV_KIOSK_KEY } from '../decorators/tv-kiosk.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import type { DeviceType } from '../../config/configuration';
import { isIssuedBeforeLastShiftCutoff } from '../utils/shift-logout.util';

interface AccessTokenPayload {
  sub: number;
  username: string;
  role: UserRole;
  deviceType: DeviceType;
  lang: SupportedLanguage;
  iat?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const allowsTvKiosk = this.reflector.getAllAndOverride<boolean>(
      TV_KIOSK_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();

    if (allowsTvKiosk && this.authenticateTvKiosk(request)) {
      return true;
    }

    const authHeader = request.headers.authorization;
    const token = this.extractBearerToken(
      Array.isArray(authHeader) ? authHeader[0] : authHeader,
    );
    if (!token) {
      throw new UnauthorizedException('Missing or invalid access token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        },
      );

      if (payload.iat !== undefined) {
        const shiftLogoutEnabled = this.configService.get<boolean>(
          'jwt.shiftLogoutEnabled',
          true,
        );

        if (
          shiftLogoutEnabled &&
          isIssuedBeforeLastShiftCutoff(new Date(payload.iat * 1000), {
            enabled: true,
            morningCutoff: this.configService.get<string>(
              'jwt.shiftCutoffMorning',
              '07:00',
            ),
            eveningCutoff: this.configService.get<string>(
              'jwt.shiftCutoffEvening',
              '19:00',
            ),
          })
        ) {
          throw new UnauthorizedException({
            message:
              'Session expired due to shift change. Please log in again.',
            code: 'SHIFT_LOGOUT_REQUIRED',
          });
        }
      }

      request.user = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
        deviceType: payload.deviceType,
        lang: payload.lang,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private authenticateTvKiosk(request: {
    headers: Record<string, string | string[] | undefined>;
    user?: AuthenticatedUser;
  }): boolean {
    const configuredKey = this.configService.get<string>('tv.kioskKey');
    if (!configuredKey) {
      return false;
    }

    const headerValue = request.headers['x-tv-kiosk-key'];
    const providedKey = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (!providedKey || providedKey !== configuredKey) {
      return false;
    }

    request.user = {
      id: 0,
      username: 'tv-kiosk',
      role: 'user',
      deviceType: 'tv',
      lang: 'th',
    };

    return true;
  }

  private extractBearerToken(
    authorization: string | undefined,
  ): string | undefined {
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authorization.slice('Bearer '.length).trim();
    return token.length > 0 ? token : undefined;
  }
}
