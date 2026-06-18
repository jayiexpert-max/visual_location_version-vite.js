import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  FIFO_ISSUE_MODE_EXPIRATION,
  FIFO_ISSUE_MODE_IM_BATCH,
} from '../constants/fifo-settings.constants';

export class UpdateFifoSettingsDto {
  @ApiProperty({ enum: [FIFO_ISSUE_MODE_EXPIRATION, FIFO_ISSUE_MODE_IM_BATCH] })
  @IsString()
  @IsIn([FIFO_ISSUE_MODE_EXPIRATION, FIFO_ISSUE_MODE_IM_BATCH])
  fifoIssueMode: string;

  @ApiProperty({ example: 'DUMMYBATCH' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  fifoDummyIm: string;

  @ApiProperty({ description: 'Admin password confirmation' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
