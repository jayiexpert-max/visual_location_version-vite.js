import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class BookingOutPuidDto {
  @ApiProperty({ example: 'VL1234567890' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  puid: string;

  @ApiProperty({ example: 'operator01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  operator: string;

  @ApiProperty({ enum: ['STORE', 'OTHER'] })
  @IsIn(['STORE', 'OTHER'])
  destination: 'STORE' | 'OTHER';
}
