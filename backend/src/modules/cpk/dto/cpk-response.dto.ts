import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CpkResponseDto {
  @ApiPropertyOptional({ example: 'S', enum: ['S', 'E'] })
  Status?: string;

  @ApiPropertyOptional({ example: 'OK' })
  Message?: string;

  @ApiPropertyOptional({ type: [String], example: [] })
  Warnings?: string[];

  [key: string]: unknown;
}
