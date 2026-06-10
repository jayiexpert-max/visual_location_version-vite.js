import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ResPuidRecvDto {
  @ApiProperty({ example: 'RES2024001' })
  @IsString()
  @IsNotEmpty()
  resNo: string;

  @ApiProperty({ example: 'VL1234567890' })
  @IsString()
  @IsNotEmpty()
  puid: string;

  @ApiProperty({ example: 'operator01' })
  @IsString()
  @IsNotEmpty()
  operator: string;

  @ApiPropertyOptional({ example: 'Rack A L1 Box 01', maxLength: 100 })
  @IsOptional()
  @IsString()
  location?: string;
}
