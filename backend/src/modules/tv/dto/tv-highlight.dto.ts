import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SetTvHighlightDto {
  @ApiPropertyOptional({ example: 'HANA-12345' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ example: 'ABC123456789' })
  @IsOptional()
  @IsString()
  puid?: string;

  @ApiProperty({ example: 42 })
  @IsInt()
  @Min(1)
  boxId: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  slotId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  slotNo?: number | string;

  @ApiPropertyOptional({ example: 'A-01' })
  @IsOptional()
  @IsString()
  boxCode?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  levelNo?: number | string;

  @ApiPropertyOptional({ example: 'Rack-A' })
  @IsOptional()
  @IsString()
  rackName?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  qty?: number;

  @ApiPropertyOptional({ example: 'operator01' })
  @IsOptional()
  @IsString()
  searchedBy?: string;

  @ApiPropertyOptional({ example: 'highlight' })
  @IsOptional()
  @IsString()
  actionType?: string;
}

export class TvHighlightResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  productName: string | null;

  @ApiPropertyOptional()
  puid: string | null;

  @ApiProperty()
  boxId: number;

  @ApiPropertyOptional()
  slotId: number | null;

  @ApiPropertyOptional()
  slotNo: number | null;

  @ApiPropertyOptional()
  rackName: string | null;

  @ApiPropertyOptional()
  levelNo: number | null;

  @ApiPropertyOptional()
  boxCode: string | null;

  @ApiProperty()
  qty: number;

  @ApiPropertyOptional()
  searchedBy: string | null;

  @ApiProperty()
  highlightSeq: string;

  @ApiProperty()
  actionType: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;
}
