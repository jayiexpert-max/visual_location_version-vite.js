import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBoxDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  levelId: number;

  @ApiPropertyOptional({ example: 'A1', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  boxCode?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  positionInLevel?: number;

  @ApiPropertyOptional({ example: '2x5', description: 'Grid dimensions rows x cols' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+x\d+$/, { message: 'layout must be in NxM format (e.g. 2x5)' })
  layout?: string;

  @ApiPropertyOptional({ example: 'Small parts box' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ioDeviceId?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ioOutputPin?: number;
}
