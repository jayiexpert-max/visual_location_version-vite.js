import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SyncExpirationDto {
  @ApiPropertyOptional({ description: 'Search filter (HanaPart / IM / PUID)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Reservation number — sync this RES only' })
  @IsOptional()
  @IsString()
  resNo?: string;
}

export class UpdateExpirationDto {
  @ApiPropertyOptional({ description: 'inventory_receive.id (PHP parity)' })
  @IsOptional()
  id?: number;
}
