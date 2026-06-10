import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ClearCacheDto {
  @ApiPropertyOptional({ example: 'ALL', default: 'ALL' })
  @IsOptional()
  @IsString()
  clearTarget?: string;
}
