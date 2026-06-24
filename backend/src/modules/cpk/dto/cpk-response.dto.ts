import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CpkResponseDto {
  @ApiPropertyOptional({ example: 'S', enum: ['S', 'E'] })
  Status?: string;

  @ApiPropertyOptional({ example: 'OK' })
  Message?: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { oneOf: [{ type: 'string' }, { type: 'object' }] },
    example: [],
  })
  Warnings?: unknown[];

  [key: string]: unknown;
}
