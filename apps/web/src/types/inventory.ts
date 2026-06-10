export interface InventoryReceive {
  id: number;
  ReceiveDate: string;
  PUID: string;
  ReservationNo: string | null;
  IM: string | null;
  HanaPart: string;
  Customer: string | null;
  Description: string | null;
  MnfPartNo: string | null;
  LotNo: string | null;
  DateCode: string | null;
  ExpirationDate: string | null;
  QtyRemain: number;
  StatusName: string | null;
  LocShelf: string | null;
  LocLevel: string | null;
  LocBox: string | null;
  Remark: string | null;
}

export interface InventoryLocation {
  product_id: number;
  part_name: string;
  current_qty: number;
  product_remark: string | null;
  slot_id: number;
  slot_no: number;
  box_id: number;
  box_code: string;
  level_id: number;
  level_no: number;
  rack_id: number;
  rack_name: string;
  earliest_expiration: string | null;
}

export interface InventorySearchResult {
  query: string;
  puidMatches: InventoryReceive[];
  hanaPartMatches: InventoryReceive[];
  locations: InventoryLocation[];
}
