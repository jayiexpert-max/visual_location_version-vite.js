import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetPicklistDetailDto {
  @ApiProperty({ example: 'PL2024001' })
  @IsString()
  @IsNotEmpty()
  picklistId: string;
}
