import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ReceiveReturnDto {
  @ApiProperty({ example: 'VL-PUID-001', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  puid: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotId: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty: number;

  @ApiPropertyOptional({ example: 'Return from production line' })
  @IsOptional()
  @IsString()
  remark?: string;
}
