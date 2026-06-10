export interface CpkResponseBody {
  Status?: string;
  Message?: string;
  Warnings?: string[];
  Picklists?: CpkPicklistSummary[];
  OpenPicklists?: CpkPicklistSummary[];
  Items?: CpkPicklistLine[];
  Materials?: CpkPicklistLine[];
  Details?: CpkPicklistLine[];
  [key: string]: unknown;
}

export interface CpkPicklistSummary {
  PicklistID?: string;
  PicklistNo?: string;
  PicklistDate?: string;
  Status?: string;
  Station?: string;
  Machine?: string;
  MachineName?: string;
  QtyTotal?: number;
  LineCount?: number;
  [key: string]: unknown;
}

export interface CpkPicklistLine {
  LineNo?: number | string;
  PartNo?: string;
  HanaPart?: string;
  IM?: string;
  Description?: string;
  Qty?: number;
  QtyRequired?: number;
  QtyReq?: number;
  QtyPicked?: number;
  QtyIssued?: number;
  UOM?: string;
  Status?: string;
  PUID?: string;
  [key: string]: unknown;
}

export function getPicklistId(item: CpkPicklistSummary): string {
  const id = item.PicklistID ?? item.PicklistNo ?? item.picklistId ?? item.picklistNo;
  return typeof id === 'string' ? id : String(id ?? '');
}

export function extractPicklists(data: CpkResponseBody): CpkPicklistSummary[] {
  const keys = ['Picklists', 'OpenPicklists', 'Items', 'List'] as const;
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) return value as CpkPicklistSummary[];
  }
  return [];
}

export function extractPicklistLines(data: CpkResponseBody): CpkPicklistLine[] {
  const keys = ['Materials', 'Items', 'Details', 'Lines'] as const;
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) return value as CpkPicklistLine[];
  }
  return [];
}

export function getLineQtyRequired(line: CpkPicklistLine): number {
  const qty = line.QtyRequired ?? line.QtyReq ?? line.Qty ?? 0;
  return typeof qty === 'number' ? qty : Number(qty) || 0;
}

export function getLineQtyPicked(line: CpkPicklistLine): number {
  const qty = line.QtyPicked ?? line.QtyIssued ?? 0;
  return typeof qty === 'number' ? qty : Number(qty) || 0;
}

export function getLinePartNo(line: CpkPicklistLine): string {
  return String(line.HanaPart ?? line.PartNo ?? line.IM ?? '—');
}

export function isCpkSuccess(data: CpkResponseBody): boolean {
  return data.Status === 'S' || data.Status === 's' || data.Status === 'Success';
}
