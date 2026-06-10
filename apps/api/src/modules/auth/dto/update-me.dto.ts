import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserLang } from '../../../entities/user.entity';

export class UpdateMeDto {
  @ApiPropertyOptional({
    enum: UserLang,
    example: UserLang.En,
    description: 'Preferred UI language',
  })
  @IsOptional()
  @IsEnum(UserLang)
  lang?: UserLang;
}
