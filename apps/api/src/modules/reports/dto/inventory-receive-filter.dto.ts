import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class InventoryReceiveFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  puid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  im?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hanaPart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateCode?: string;

  @ApiPropertyOptional({ description: 'Filter by expiration date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  expDate?: string;
}
