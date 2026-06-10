import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HierarchyProductDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'HANA-12345' })
  name: string;

  @ApiProperty({ example: 5 })
  qty: number;
}

export class HierarchySlotDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  slotNo: number;

  @ApiPropertyOptional({ type: HierarchyProductDto })
  product?: HierarchyProductDto | null;
}

export class HierarchyBoxDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'A1' })
  boxCode: string;

  @ApiProperty({ example: '2x5' })
  layout: string;

  @ApiPropertyOptional({ example: 1 })
  positionInLevel?: number | null;

  @ApiProperty({ type: [HierarchySlotDto] })
  slots: HierarchySlotDto[];
}

export class HierarchyLevelDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  levelNo: number;

  @ApiProperty({ type: [HierarchyBoxDto] })
  boxes: HierarchyBoxDto[];
}

export class HierarchyRackDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Rack-A' })
  name: string;

  @ApiPropertyOptional({ example: 'Zone A' })
  locationDesc?: string | null;

  @ApiProperty({ type: [HierarchyLevelDto] })
  levels: HierarchyLevelDto[];
}

export class WarehouseHierarchyResponseDto {
  @ApiProperty({ type: [HierarchyRackDto] })
  racks: HierarchyRackDto[];
}
