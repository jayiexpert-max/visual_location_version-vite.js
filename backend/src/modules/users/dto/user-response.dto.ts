import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User, UserLang, UserRole } from '../../../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.Admin })
  role!: UserRole;

  @ApiProperty({ enum: UserLang, example: UserLang.Th })
  lang!: UserLang;

  @ApiProperty({ example: '2024-01-15T08:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: 'admin@example.com', nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ example: 'Warehouse supervisor', nullable: true })
  remark!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      lang: user.lang,
      createdAt: user.createdAt,
      email: user.email,
      remark: user.remark,
      isActive: Boolean(user.isActive),
    };
  }
}
