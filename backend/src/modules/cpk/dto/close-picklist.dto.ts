import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ClosePicklistDto {
  @ApiProperty({ example: 'PL2024001' })
  @IsString()
  @IsNotEmpty()
  picklistId: string;

  @ApiProperty({ example: 'operator01' })
  @IsString()
  @IsNotEmpty()
  operator: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  kitsNote?: string;
}
