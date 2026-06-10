import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class IssuePuidToPicklistDto {
  @ApiProperty({ example: 'PL2024001' })
  @IsString()
  @IsNotEmpty()
  picklistId: string;

  @ApiProperty({ example: 'VL1234567890' })
  @IsString()
  @IsNotEmpty()
  puid: string;

  @ApiProperty({ example: 'operator01' })
  @IsString()
  @IsNotEmpty()
  operator: string;
}
