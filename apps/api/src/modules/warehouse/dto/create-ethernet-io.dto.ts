import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEthernetIoDto {
  @ApiProperty({ example: 'Rack-A IO', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '192.168.1.50', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  ipAddress: string;

  @ApiPropertyOptional({ example: 80, default: 80 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  port?: number;

  @ApiPropertyOptional({ example: 'http', default: 'http' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  controllerType?: string;

  @ApiPropertyOptional({
    example: 'http://{IP}:{PORT}/relay.cgi?relay={PIN}&state={STATE}',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  urlFormat?: string;

  @ApiPropertyOptional({ example: 16, default: 16 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  inputs?: number;

  @ApiPropertyOptional({ example: 16, default: 16 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  outputs?: number;
}
