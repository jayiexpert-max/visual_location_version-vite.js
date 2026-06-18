import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserLang, UserRole } from '../../../entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'warehouse_user', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @ApiPropertyOptional({ example: 'NewSecurePass123', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.User })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserLang, example: UserLang.En })
  @IsOptional()
  @IsEnum(UserLang)
  lang?: UserLang;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ example: 'Receiving team' })
  @IsOptional()
  @IsString()
  remark?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}
