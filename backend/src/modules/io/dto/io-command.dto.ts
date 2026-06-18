import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class IoBoxCommandDto {
  @ApiProperty({ example: 42 })
  @IsInt()
  @Min(1)
  boxId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  slotNo?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  slotId?: number;
}

export class IoCommandResultDto {
  @ApiProperty({ enum: ['success', 'warning', 'error'] })
  status: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  pinCount?: number;
}

export class IoTestOutputDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  deviceId: number;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  pin: number;

  @ApiPropertyOptional({ example: 'box' })
  @IsOptional()
  role?: string;
}
