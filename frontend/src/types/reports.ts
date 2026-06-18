export type ExpirationStatus = 'all' | 'expired' | 'soon' | 'normal' | 'all_stock';

export interface ExpirationReportItem {
  id: string; // synthetic ID for DataGrid/React loop keys, maybe HanaPart+IM
  hanaPart: string | null;
  im: string | null;
  description?: string | null;
  puidCount: number;
  totalQty: number;
  lotsRaw: string | null;
  expirationDate: string | null;
  statusText?: string;
  daysLeft?: number;
}

export interface ExpirationReportParams {
  status?: ExpirationStatus;
  days?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  search?: string;
  resNo?: string;
}

export interface InventoryLocationFields {
  locShelf?: string | null;
  locLevel?: string | number | null;
  locBox?: string | null;
}

export function formatInventoryLocation(row: InventoryLocationFields): string {
  const parts = [
    row.locShelf ? `Rack ${row.locShelf}` : '',
    row.locLevel ? `L${row.locLevel}` : '',
    row.locBox ? `Box ${row.locBox}` : '',
  ].filter(Boolean);
  return parts.join(' ') || '—';
}
