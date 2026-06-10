import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class GetOpenPicklistsDto {
  @ApiPropertyOptional({
    description: 'Optional filter fields forwarded to CPK (PublicUID injected server-side)',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  filters?: Record<string, unknown>;
}
