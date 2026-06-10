import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ExpirationReportFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search HanaPart, IM, or PUID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['all', 'expired', 'soon', 'normal', 'all_stock'],
    default: 'all',
    description: 'Expiration status filter',
  })
  @IsOptional()
  @IsIn(['all', 'expired', 'soon', 'normal', 'all_stock'])
  status?: 'all' | 'expired' | 'soon' | 'normal' | 'all_stock';
}

export class ExpirationReportItemDto {
  @ApiPropertyOptional()
  id: number;

  @ApiPropertyOptional()
  hanaPart: string | null;

  @ApiPropertyOptional()
  im: string | null;

  @ApiPropertyOptional()
  puid: string | null;

  @ApiPropertyOptional()
  qtyRemain: number | null;

  @ApiPropertyOptional()
  expirationDate: Date | null;

  @ApiPropertyOptional()
  locShelf: string | null;

  @ApiPropertyOptional()
  locLevel: string | null;

  @ApiPropertyOptional()
  locBox: string | null;

  @ApiPropertyOptional()
  statusText: string;

  @ApiPropertyOptional()
  daysLeft: number;
}
