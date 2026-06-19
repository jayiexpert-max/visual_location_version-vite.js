import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BoxLayoutPuidDto {
  @ApiProperty({ example: '08AM1L' })
  puid: string;

  @ApiPropertyOptional({ example: '2027-05-29' })
  expirationDate?: string | null;

  @ApiPropertyOptional({ example: false })
  isExpired?: boolean;

  @ApiPropertyOptional({ example: false })
  isNearExpiry?: boolean;
}

export class BoxLayoutProductDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'HANA-12345' })
  name: string;

  @ApiProperty({ example: 10 })
  qty: number;

  @ApiPropertyOptional({ example: 'Damaged batch' })
  remark?: string | null;
}

export class BoxLayoutCellDto {
  @ApiProperty({ example: 1 })
  slotId: number;

  @ApiProperty({ example: 1 })
  slotNo: number;

  @ApiProperty({ example: 0, description: 'Zero-based row index' })
  row: number;

  @ApiProperty({ example: 0, description: 'Zero-based column index' })
  col: number;

  @ApiProperty({ example: false })
  highlighted: boolean;

  @ApiPropertyOptional({ type: BoxLayoutProductDto })
  product?: BoxLayoutProductDto | null;

  @ApiPropertyOptional({
    type: [BoxLayoutPuidDto],
    description: 'Active PUIDs in slot (inventory_receive)',
  })
  puids?: BoxLayoutPuidDto[];
}

export class BoxLayoutResponseDto {
  @ApiProperty({ example: 1 })
  boxId: number;

  @ApiProperty({ example: 'A1' })
  boxCode: string;

  @ApiProperty({ example: '2x5' })
  layout: string;

  @ApiProperty({ example: 2, description: 'Number of rows in grid' })
  rows: number;

  @ApiProperty({ example: 5, description: 'Number of columns in grid' })
  cols: number;

  @ApiPropertyOptional({ example: 1 })
  rackId?: number | null;

  @ApiPropertyOptional({ example: 'Rack-A' })
  rackName?: string | null;

  @ApiPropertyOptional({ example: 2 })
  levelNo?: number | null;

  @ApiProperty({ type: [BoxLayoutCellDto] })
  cells: BoxLayoutCellDto[];
}
