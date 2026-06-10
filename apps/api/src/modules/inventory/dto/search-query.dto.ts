import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({
    example: 'HANA-12345',
    description: 'HanaPart number or PUID to search',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q: string;
}
