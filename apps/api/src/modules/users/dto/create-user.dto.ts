import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserLang, UserRole } from '../../../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'warehouse_user', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username!: string;

  @ApiProperty({ example: 'SecurePass123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.User })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ enum: UserLang, example: UserLang.Th })
  @IsOptional()
  @IsEnum(UserLang)
  lang?: UserLang;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'Receiving team' })
  @IsOptional()
  @IsString()
  remark?: string;
}
