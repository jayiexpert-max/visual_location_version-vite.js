import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ReceiveItemDto {
  @ApiProperty({ example: 'VL-PUID-001', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  puid: string;

  @ApiProperty({ example: 'HANA-12345', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  hanaPart: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotId: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty: number;

  @ApiPropertyOptional({ example: 'RES-2024-001', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reservationNo?: string;

  @ApiPropertyOptional({ example: 'IM-12345', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  im?: string;

  @ApiPropertyOptional({ example: 'Customer A', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customer?: string;

  @ApiPropertyOptional({ example: 'Resistor 10K', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: 'MNF-001', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mnfPartNo?: string;

  @ApiPropertyOptional({ example: 'LOT-001', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotNo?: string;

  @ApiPropertyOptional({ example: '2024W01', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  dateCode?: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ example: 'Available', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusName?: string;

  @ApiPropertyOptional({ example: 'Rack-A', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  locShelf?: string;

  @ApiPropertyOptional({ example: '2', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  locLevel?: string;

  @ApiPropertyOptional({ example: 'A1', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  locBox?: string;

  @ApiPropertyOptional({ example: 'Urgent receive' })
  @IsOptional()
  @IsString()
  remark?: string;
}
