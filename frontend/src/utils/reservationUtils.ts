export type ResPuidRow = Record<string, unknown> & {
  PUID?: string;
  QtyRemain?: number | null;
  BatchNumber?: string;
  ExpireDate?: string;
  Received?: unknown;
  is_already_in_db?: boolean;
  is_issued_out?: boolean;
  cpk_received?: boolean;
  is_received?: boolean;
};

export type ResItemRow = Record<string, unknown> & {
  ItemNo?: string;
  PartNumber?: string;
  RequestQty?: number | string;
  MatReqQty?: number | string;
  ReqQty?: number | string;
  PUIDList?: ResPuidRow[];
};

export type ResDetailData = Record<string, unknown> & {
  ReservationNo?: string;
  Items?: ResItemRow[];
};

export interface ResDetailResponse {
  status: 'success' | 'error';
  message?: string;
  data?: ResDetailData;
  meta?: {
    itemCount?: number;
    puidCount?: number;
    listStatus?: string;
    item_count?: number;
    puid_count?: number;
    list_status?: string;
  };
}

export interface ReservationListItem {
  id: number;
  resNo: string | null;
  reqDate: string | null;
  status: string;
}

export function normalizeResNo(value: string): string {
  return value.trim().toUpperCase().replace(/^RES/i, '');
}

export function normalizePuidInput(value: string): string {
  return value.trim().toUpperCase().replace(/^VL/i, '');
}

export function isCpkReceivedFlag(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const v = String(value).toUpperCase().trim();
  return ['Y', 'YES', 'TRUE', '1', 'R', 'RECEIVED', 'DONE'].includes(v);
}

export function isPuidLocallyReceived(p: ResPuidRow): boolean {
  return Boolean(p.is_already_in_db);
}

export function isPuidIssuedOut(p: ResPuidRow): boolean {
  return Boolean(p.is_issued_out);
}

export function isPuidCpkReceived(p: ResPuidRow): boolean {
  return Boolean(p.cpk_received || isCpkReceivedFlag(p.Received));
}

export function isPuidReceived(p: ResPuidRow): boolean {
  return isPuidLocallyReceived(p) || isPuidCpkReceived(p) || Boolean(p.is_received);
}

/** Warehouse-truth status for RES PUID lines (desktop + handheld). */
export type ResPuidLineState = 'received' | 'issued' | 'cpkOnly' | 'pending';

export function getPuidLineState(row: ResPuidRow): ResPuidLineState {
  if (isPuidLocallyReceived(row)) return 'received';
  if (isPuidIssuedOut(row)) return 'issued';
  if (isPuidCpkReceived(row)) return 'cpkOnly';
  return 'pending';
}

export const RES_PUID_STATUS_I18N: Record<ResPuidLineState, string> = {
  received: 'pages:resPuidStatusReceived',
  issued: 'pages:resPuidStatusIssued',
  cpkOnly: 'pages:resPuidStatusNotInWarehouse',
  pending: 'pages:resPuidStatusPending',
};

export function countPuidsByLineState(puids: ResPuidRow[]): Record<ResPuidLineState, number> {
  const counts: Record<ResPuidLineState, number> = {
    received: 0,
    issued: 0,
    cpkOnly: 0,
    pending: 0,
  };
  for (const p of puids) {
    counts[getPuidLineState(p)] += 1;
  }
  return counts;
}

export function formatExpireDate(value: unknown): string {
  if (!value) return '-';
  const raw = String(value);
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

export function parseExpirationDate(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^\d{8}$/.test(raw)) {
    return new Date(
      parseInt(raw.slice(0, 4), 10),
      parseInt(raw.slice(4, 6), 10) - 1,
      parseInt(raw.slice(6, 8), 10),
    );
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isPuidExpired(expirationValue: unknown): boolean {
  const exp = parseExpirationDate(expirationValue);
  if (!exp) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return exp < today;
}

export function formatPuidQtyRemain(p: ResPuidRow, item?: ResItemRow): string {
  if (p.QtyRemain !== undefined && p.QtyRemain !== null) {
    return String(p.QtyRemain);
  }
  const fallback = item?.RequestQty ?? item?.MatReqQty ?? item?.ReqQty;
  if (fallback !== undefined && fallback !== null && fallback !== '') {
    return String(fallback);
  }
  return '-';
}

export function resNoKey(value: string | null | undefined): string {
  return normalizeResNo(String(value ?? ''));
}

export function isResCompleted(items: ResItemRow[]): boolean {
  if (items.length === 0) return false;
  return items.every((item) => {
    const puids = item.PUIDList ?? [];
    return (
      puids.length > 0 &&
      puids.every((p) => isPuidLocallyReceived(p) || isPuidIssuedOut(p))
    );
  });
}
