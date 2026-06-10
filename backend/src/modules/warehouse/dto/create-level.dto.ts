import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateLevelDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rackId: number;

  @ApiProperty({ example: 1, description: '1 = bottom shelf' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  levelNo: number;

  @ApiPropertyOptional({ example: 'Top shelf' })
  @IsOptional()
  @IsString()
  remark?: string;
}
