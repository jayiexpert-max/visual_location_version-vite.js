import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class StockMovementsFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search product name, username, or PUID in action' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['add', 'withdraw', 'res_receive', 'picklist_issue', 'booking_out'],
    description: 'Filter by stock log action type',
  })
  @IsOptional()
  @IsIn(['add', 'withdraw', 'res_receive', 'picklist_issue', 'booking_out'])
  actionFilter?: 'add' | 'withdraw' | 'res_receive' | 'picklist_issue' | 'booking_out';
}

export class StockMovementItemDto {
  @ApiPropertyOptional()
  id: number;

  @ApiPropertyOptional()
  productId: number;

  @ApiPropertyOptional()
  productName: string | null;

  @ApiPropertyOptional()
  action: string;

  @ApiPropertyOptional()
  actionType: string;

  @ApiPropertyOptional()
  quantity: number;

  @ApiPropertyOptional()
  userId: number;

  @ApiPropertyOptional()
  username: string | null;

  @ApiPropertyOptional()
  createdAt: Date;
}
