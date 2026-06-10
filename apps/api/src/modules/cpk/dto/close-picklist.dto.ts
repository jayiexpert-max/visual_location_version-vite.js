import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ClosePicklistDto {
  @ApiProperty({ example: 'PL2024001' })
  @IsString()
  @IsNotEmpty()
  picklistId: string;

  @ApiProperty({ example: 'operator01' })
  @IsString()
  @IsNotEmpty()
  operator: string;
}
