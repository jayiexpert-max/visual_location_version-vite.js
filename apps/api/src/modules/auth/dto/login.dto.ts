import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { RefreshTokenDeviceType } from '../../../entities/refresh-token.entity';

export class LoginDto {
  @ApiProperty({ example: 'admin', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username!: string;

  @ApiProperty({ example: 'secret-password' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    enum: RefreshTokenDeviceType,
    example: RefreshTokenDeviceType.Desktop,
    description: 'Client device type for token expiry policy',
  })
  @IsEnum(RefreshTokenDeviceType)
  deviceType!: RefreshTokenDeviceType;
}
