import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PuidParamDto {
  @ApiProperty({ example: 'VL-PUID-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  puid: string;
}
