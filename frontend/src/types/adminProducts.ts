export interface ProductAdminRow {
  id: number;
  slotId: number | null;
  name: string | null;
  qty: number;
  remark: string | null;
  slotNo: number | null;
  boxId: number | null;
  boxCode: string | null;
  levelNo: number | null;
  rackName: string | null;
}

export interface ProductBoxOption {
  id: number;
  boxCode: string;
  layout: string | null;
  levelNo: number;
  rackName: string;
  slotTotal: number;
  mappedCount: number;
}

export interface ProductSlotOption {
  id: number;
  slotNo: number;
  boxId: number;
  boxCode: string;
  levelNo: number;
  rackName: string;
}

export interface FifoSettings {
  fifoIssueMode: string;
  fifoDummyIm: string;
  fifoIssueModeLabel: string;
  updatedAt: string | null;
  updatedByUsername: string | null;
}
