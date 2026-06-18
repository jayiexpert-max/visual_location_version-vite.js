import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetPicklistDetailDto {
  @ApiProperty({ example: 'PL2024001' })
  @IsString()
  @IsNotEmpty()
  picklistId: string;

  @ApiPropertyOptional({ description: 'Filter lines with SAP_Info _{ReqQty}' })
  @IsOptional()
  @IsBoolean()
  requiredOnly?: boolean;
}
