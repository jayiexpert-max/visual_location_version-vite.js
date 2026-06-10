import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticate with username and password' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  @ApiResponse({ status: 201, description: 'Refresh token revoked' })
  logout(@Body() dto: RefreshTokenDto): Promise<{ success: true }> {
    return this.authService.logout(dto.refreshToken).then(() => ({
      success: true,
    }));
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.getMe(user.id);
  }

  @Patch('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeDto,
  ): Promise<UserResponseDto> {
    return this.authService.updateMe(user.id, dto);
  }
}
