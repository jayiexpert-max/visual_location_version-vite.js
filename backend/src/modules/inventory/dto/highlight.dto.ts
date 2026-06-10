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

export class HighlightDto {
  @ApiProperty({
    example: 'HANA-12345',
    description: 'HanaPart or PUID to locate and highlight',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  query: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Override slot ID when location is already known',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotId?: number;
}

export class HighlightLocationDto {
  @ApiProperty({ example: 1 })
  rackId: number;

  @ApiProperty({ example: 'Rack-A' })
  rackName: string;

  @ApiProperty({ example: 2 })
  levelNo: number;

  @ApiProperty({ example: 1 })
  boxId: number;

  @ApiProperty({ example: 'A1' })
  boxCode: string;

  @ApiProperty({ example: 3 })
  slotId: number;

  @ApiProperty({ example: 3 })
  slotNo: number;
}

export class HighlightTvPayloadDto {
  @ApiProperty({ example: 'highlight-seq-abc123' })
  highlightSeq: string;

  @ApiProperty({ example: 'HANA-12345' })
  productName: string;

  @ApiProperty({ example: 1 })
  boxId: number;

  @ApiProperty({ example: 3 })
  slotId: number;

  @ApiProperty({ example: 3 })
  slotNo: number;

  @ApiProperty({ example: 'Rack-A' })
  rackName: string;

  @ApiProperty({ example: 2 })
  levelNo: number;

  @ApiProperty({ example: 'A1' })
  boxCode: string;

  @ApiProperty({ example: 10 })
  qty: number;

  @ApiProperty({ example: '2026-06-10T12:00:00.000Z' })
  expiresAt: string;
}

export class HighlightIoPayloadDto {
  @ApiProperty({ example: 1 })
  deviceId: number;

  @ApiProperty({ example: 5 })
  outputPin: number;

  @ApiProperty({ example: 'published', enum: ['published', 'skipped', 'failed'] })
  status: string;
}

export class HighlightResponseDto {
  @ApiProperty({ type: HighlightLocationDto })
  location: HighlightLocationDto;

  @ApiProperty({ type: HighlightTvPayloadDto })
  tv: HighlightTvPayloadDto;

  @ApiPropertyOptional({ type: HighlightIoPayloadDto })
  io?: HighlightIoPayloadDto | null;
}
