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

/** Material inbound — parity with PHP add_stock.php POST body */
export class AddStockDto {
  @ApiProperty({ example: '1234567890', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  puid: string;

  @ApiProperty({ example: 'IM-12345', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  im: string;

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

  @ApiProperty({ example: 5000, description: 'Full reel quantity (Qty)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  qty: number;

  @ApiProperty({ example: 4800, description: 'Actual counted remain (QtyRemain)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qtyRemain: number;

  @ApiPropertyOptional({ example: '2026-06-10T10:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  receiveDate?: string;

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

  @ApiPropertyOptional({ example: '8mm', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  binSize?: string;

  @ApiPropertyOptional({ example: 'Available', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusName?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mcId?: number;

  @ApiPropertyOptional({ example: 'Line-1', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  machineName?: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ example: 'OLD-IM', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  oldIm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;

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

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locSlot?: number;

  @ApiPropertyOptional({ example: 'RES-2024-001', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reservationNo?: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expireDateRoomTemp?: string;
}
