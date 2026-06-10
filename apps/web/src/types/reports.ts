export type ExpirationStatus = 'all' | 'expired' | 'soon' | 'normal' | 'all_stock';

export interface ExpirationReportItem {
  id: number;
  hanaPart: string | null;
  im: string | null;
  description?: string | null;
  puid: string | null;
  qtyRemain: number | null;
  expirationDate: string | null;
  locShelf: string | null;
  locLevel: string | null;
  locBox: string | null;
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
}

export function formatInventoryLocation(row: Pick<
  ExpirationReportItem,
  'locShelf' | 'locLevel' | 'locBox'
>): string {
  const parts = [
    row.locShelf ? `Rack ${row.locShelf}` : '',
    row.locLevel ? `L${row.locLevel}` : '',
    row.locBox ? `Box ${row.locBox}` : '',
  ].filter(Boolean);
  return parts.join(' ') || '—';
}
