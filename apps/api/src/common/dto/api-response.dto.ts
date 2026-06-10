import { ApiProperty } from '@nestjs/swagger';

export class ApiSuccessResponseDto<T> {
  @ApiProperty({ example: 'success', enum: ['success'] })
  status!: 'success';

  @ApiProperty({ description: 'Response payload' })
  data!: T;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: 'error', enum: ['error'] })
  status!: 'error';

  @ApiProperty({ example: 'Human-readable message' })
  message!: string;

  @ApiProperty({ example: 'INVENTORY_PUID_NOT_FOUND' })
  code!: string;

  @ApiProperty({
    description: 'Optional structured error details',
    type: 'object',
    additionalProperties: true,
  })
  details!: Record<string, unknown> | unknown[];
}

export interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
}

export interface ApiErrorResponse {
  status: 'error';
  message: string;
  code: string;
  details: Record<string, unknown> | unknown[];
}
