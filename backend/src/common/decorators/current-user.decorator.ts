import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SupportedLanguage, UserRole } from '@visual-location/shared';
import type { DeviceType } from '../../config/configuration';

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: UserRole;
  deviceType: DeviceType;
  lang: SupportedLanguage;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
