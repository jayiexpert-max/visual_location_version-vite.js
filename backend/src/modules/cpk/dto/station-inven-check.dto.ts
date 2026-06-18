import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class StationInvenCheckDto {
  @ApiPropertyOptional({ example: 'PL2024001' })
  @IsOptional()
  @IsString()
  picklistId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  PUID?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  PartNumber?: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  NearExpiryDays?: number;
}
