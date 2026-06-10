import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSlotDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  boxId: number;

  @ApiProperty({ example: 1, description: 'Position within box grid (1-based)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotNo: number;

  @ApiPropertyOptional({ example: 'Reserved for urgent parts' })
  @IsOptional()
  @IsString()
  remark?: string;
}
