import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class TvKioskGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();

    const configuredKey = this.configService.get<string>('tv.kioskKey');
    if (!configuredKey) {
      throw new UnauthorizedException('TV kiosk authentication is not configured');
    }

    const headerValue = request.headers['x-tv-kiosk-key'];
    const providedKey = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (!providedKey || providedKey !== configuredKey) {
      throw new UnauthorizedException('Invalid TV kiosk key');
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
}
