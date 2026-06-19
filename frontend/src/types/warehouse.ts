export interface BoxLayoutPuid {
  puid: string;
  expirationDate?: string | null;
  isExpired?: boolean;
  isNearExpiry?: boolean;
}

export interface HierarchyProduct {
  id: number;
  name: string;
  qty: number;
}

export interface HierarchySlot {
  id: number;
  slotNo: number;
  product?: HierarchyProduct | null;
  puids?: string[];
}

export interface HierarchyBox {
  id: number;
  boxCode: string;
  layout: string;
  positionInLevel?: number | null;
  slots: HierarchySlot[];
}

export interface HierarchyLevel {
  id: number;
  levelNo: number;
  boxes: HierarchyBox[];
}

export interface HierarchyRack {
  id: number;
  name: string;
  locationDesc?: string | null;
  levels: HierarchyLevel[];
}

export interface WarehouseHierarchy {
  racks: HierarchyRack[];
}

export interface BoxLayoutCell {
  slotId: number;
  slotNo: number;
  row: number;
  col: number;
  highlighted: boolean;
  puids?: BoxLayoutPuid[];
  product?: {
    id: number;
    name: string;
    qty: number;
    remark?: string | null;
  } | null;
}

export interface BoxLayout {
  boxId: number;
  boxCode: string;
  layout: string;
  rows: number;
  cols: number;
  rackId?: number | null;
  rackName?: string | null;
  levelNo?: number | null;
  cells: BoxLayoutCell[];
}

export interface EthernetIoDevice {
  id: number;
  name: string;
  ipAddress: string;
  port: number;
  controllerType: string;
  urlFormat: string;
  remark?: string | null;
}
