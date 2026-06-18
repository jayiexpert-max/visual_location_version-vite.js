/** Picklist issue line parsing — port of picklist_issue.php helpers */

export type PicklistRow = Record<string, unknown>;

export interface ParsedPicklistDetail {
  items: PicklistRow[];
  remark: string;
}

export interface ParsedOpenPicklists {
  picklists: PicklistRow[];
  remarks: Record<string, string>;
}

export interface PicklistDetailMeta {
  RequiredOnlyRequested?: boolean;
  LineCount?: number;
  LineCountRaw?: number;
  RequestBy?: string;
}

export interface FifoExpiredRoll {
  puid?: string;
  expiration_display?: string;
  expiration_date?: string;
  loc_box?: string;
}

export interface FifoIssueData {
  expired_rolls?: FifoExpiredRoll[];
  recommended_puid?: string;
  renewal_required?: boolean;
}

export function pickField(row: PicklistRow | null | undefined, keys: string[]): unknown {
  if (!row) return '';
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return '';
}

export function normalizePuid(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/^VL/, '');
}

export function extractSapItemCodeFromSapInfo(sapInfo: unknown): string {
  const s = String(sapInfo ?? '').trim();
  if (!s) return '';
  let m = s.match(/([0-9]+)_\{/);
  if (m) return m[1];
  m = s.match(/NEW\s*-\s*([0-9]+)\s*$/i);
  if (m) return m[1];
  m = s.match(/^([0-9]+)\s*$/);
  if (m) return m[1];
  return '';
}

export function extractReqQtyTokenFromSapInfo(sapInfo: unknown): string | null {
  const m = String(sapInfo ?? '').match(/_\{([0-9]+(?:[.,][0-9]+)?)\}\s*$/);
  return m ? m[1] : null;
}

export function parseReqQtyNumericFromSapInfo(sapInfo: unknown): number | null {
  const token = extractReqQtyTokenFromSapInfo(sapInfo);
  if (token == null) return null;
  const qty = parseFloat(token.replace(',', '.'));
  return qty > 0 ? qty : null;
}

export function lineRequiredQty(row: PicklistRow): string {
  const sap = pickField(row, ['SAP_Info', 'SAPInfo']);
  const fromSap = extractReqQtyTokenFromSapInfo(sap);
  if (fromSap != null) return fromSap;
  const legacy = pickField(row, ['QtyRequired', 'RequiredQty', 'ReqQty', 'Qty', 'Quantity']);
  return legacy !== '' && legacy != null ? String(legacy) : '';
}

export function lineRequiredQtyNumeric(row: PicklistRow): number {
  const sap = pickField(row, ['SAP_Info', 'SAPInfo']);
  const fromSap = parseReqQtyNumericFromSapInfo(sap);
  if (fromSap != null) return fromSap;
  return parseFloat(String(pickField(row, ['QtyRequired', 'RequiredQty', 'ReqQty', 'Qty', 'Quantity']) || 0)) || 0;
}

export function lineIsInactiveBomRow(row: PicklistRow): boolean {
  return lineRequiredQtyNumeric(row) <= 0;
}

export function lineIsActiveForIssue(row: PicklistRow): boolean {
  return !lineIsInactiveBomRow(row);
}

export function lineRawPuid(row: PicklistRow): string {
  return String(
    pickField(row, ['PUID', 'IssuedPUID', 'PUIDIssued', 'Issued_PUID', 'puid']) || '',
  ).trim();
}

export function lineIssuedPuid(row: PicklistRow): string {
  return normalizePuid(lineRawPuid(row));
}

export function linePuidIsXMark(row: PicklistRow): boolean {
  return lineRawPuid(row).toLowerCase() === 'x';
}

function statusImpliesIssued(st: string): boolean {
  const s = st.toLowerCase();
  return (
    s.includes('complete') ||
    s.includes('issued') ||
    s.includes('done') ||
    s === 'c' ||
    s.includes('จ่ายสำเร็จ') ||
    s.includes('จ่ายแล้ว')
  );
}

export function lineIsIssued(row: PicklistRow): boolean {
  const puid = lineIssuedPuid(row);
  if (puid.length >= 4) return true;
  const st = String(pickField(row, ['PicklistStatus', 'Status', 'LineStatus', 'ItemStatus']) || '');
  if (statusImpliesIssued(st)) return true;
  const req = lineRequiredQtyNumeric(row);
  const iss = parseFloat(String(pickField(row, ['QtyIssued', 'IssuedQty', 'Issued']) || 0)) || 0;
  return req > 0 && iss >= req;
}

export function lineShowsOpenStatus(row: PicklistRow): boolean {
  if (lineIsIssued(row)) return false;
  if (lineIsInactiveBomRow(row)) return false;
  if (linePuidIsXMark(row)) return false;
  return true;
}

export function lineWarehouseLocation(row: PicklistRow): string {
  const st = pickField(row, ['Station']);
  const slot = pickField(row, ['Slot']);
  const sub = pickField(row, ['SubSlot']);
  const parts: string[] = [];
  if (st !== '' && st != null) parts.push(`St${st}`);
  if (slot !== '' && slot != null) parts.push(`Sl${slot}`);
  if (sub !== '' && sub != null && String(sub) !== '0') parts.push(`Sub${sub}`);
  return parts.length ? parts.join('/') : String(pickField(row, ['Location']) || '');
}

export function picklistIdFromRow(row: PicklistRow): string {
  const id = pickField(row, ['PicklistID', 'Picklist#', 'PicklistNo', 'Picklist']);
  return id ? String(id).trim() : '';
}

export function picklistShowDate(row: PicklistRow): string {
  return String(pickField(row, ['ShowDate']) || '').trim();
}

function isPicklistPartLine(row: PicklistRow): boolean {
  if (isPicklistMetaLine(row)) return false;
  return !!pickField(row, [
    'PartNumber',
    'HanaPart',
    'MatNumber',
    'Material',
    'SAP_Info',
    'SAPInfo',
    'QtyRequired',
    'RequiredQty',
    'Qty',
    'Quantity',
  ]);
}

export function isPicklistMetaLine(row: PicklistRow): boolean {
  const part = String(
    pickField(row, ['PartNumber', 'HanaPart', 'MatNumber', 'Material']) || '',
  ).trim();
  if (!part) return false;
  const lower = part.toLowerCase();
  if (
    lower === 'request by' ||
    lower === 'requestby' ||
    lower === 'kitting room notes' ||
    lower === 'kitting notes' ||
    lower === 'notes' ||
    lower === 'remark' ||
    lower === 'requester'
  ) {
    return true;
  }
  const sap = String(pickField(row, ['SAP_Info', 'SAPInfo']) || '').trim();
  const puid = String(pickField(row, ['PUID']) || '')
    .trim()
    .toLowerCase();
  if (!sap && (puid === '' || puid === 'x') && !/\d{4,}/.test(part)) return true;
  return false;
}

function isPicklistRequestByLine(row: PicklistRow): boolean {
  const part = String(
    pickField(row, ['PartNumber', 'HanaPart', 'MatNumber', 'Material']) || '',
  )
    .trim()
    .toLowerCase();
  return part === 'request by' || part === 'requestby';
}

function extractRequestByFromItems(items: PicklistRow[]): string {
  for (let i = items.length - 1; i >= 0; i--) {
    if (isPicklistRequestByLine(items[i])) {
      return String(
        pickField(items[i], [
          'Remark',
          'RequestBy',
          'Request_By',
          'RequestByName',
          'RequestedBy',
          'Requester',
        ]) || '',
      );
    }
  }
  for (let i = items.length - 1; i >= 0; i--) {
    if (isPicklistMetaLine(items[i])) {
      const remark = pickField(items[i], [
        'Remark',
        'RequestBy',
        'Request_By',
        'RequestByName',
        'RequestedBy',
        'Requester',
      ]);
      if (remark) return String(remark);
    }
  }
  return '';
}

export function stripPicklistMetaLines(items: PicklistRow[]): PicklistRow[] {
  const out = items.slice();
  while (out.length && isPicklistMetaLine(out[out.length - 1])) {
    out.pop();
  }
  return out;
}

function extractRemarkFromCpkRow(row: PicklistRow): string {
  const direct = pickField(row, [
    'Remark',
    'RequestBy',
    'Request_By',
    'RequestByName',
    'RequestedBy',
    'Requester',
  ]);
  if (direct) return String(direct);
  const nestedKeys = ['Items', 'Lines', 'Materials', 'PicklistItems', 'List', 'Data', 'Details'];
  for (const key of nestedKeys) {
    const arr = row[key];
    if (!Array.isArray(arr) || !arr.length) continue;
    const last = arr[arr.length - 1];
    if (typeof last === 'string' && String(last).trim()) return String(last).trim();
    if (last && typeof last === 'object') {
      const fromLast = pickField(last as PicklistRow, [
        'Remark',
        'RequestBy',
        'Request_By',
        'RequestByName',
        'RequestedBy',
        'Requester',
      ]);
      if (fromLast) return String(fromLast);
      if (!isPicklistPartLine(last as PicklistRow)) {
        const alt = pickField(last as PicklistRow, ['Value', 'Text', 'Code', 'EmployeeID', 'EmpID']);
        if (alt) return String(alt);
      }
    }
  }
  return '';
}

export function parseOpenPicklistsResponse(data: unknown): ParsedOpenPicklists {
  const list = normalizePicklistList(data);
  const picklists: PicklistRow[] = [];
  const remarks: Record<string, string> = {};

  list.forEach((row, idx) => {
    const id = picklistIdFromRow(row);
    if (id) {
      picklists.push(row);
      const remark = extractRemarkFromCpkRow(row);
      if (remark) remarks[id] = remark;
      return;
    }
    if (idx === list.length - 1) {
      const tailRemark = extractRemarkFromCpkRow(row);
      let attachId = String(
        pickField(row, ['PicklistID', 'Picklist#', 'PicklistNo', 'Picklist']) || '',
      );
      if (!attachId && picklists.length) {
        attachId = picklistIdFromRow(picklists[picklists.length - 1]);
      }
      if (tailRemark && attachId) remarks[attachId] = tailRemark;
    }
  });

  return { picklists, remarks };
}

export function normalizePicklistList(data: unknown): PicklistRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as PicklistRow[];
  const obj = data as Record<string, unknown>;
  for (const key of ['Picklists', 'OpenPicklists', 'Items', 'List']) {
    const arr = obj[key];
    if (Array.isArray(arr)) return arr as PicklistRow[];
  }
  return [];
}

export function normalizeDetailItems(data: unknown): PicklistRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as PicklistRow[];
  const obj = data as Record<string, unknown>;
  for (const key of ['Lines', 'Items', 'Materials', 'PicklistItems']) {
    const arr = obj[key];
    if (Array.isArray(arr)) return arr as PicklistRow[];
  }
  return [];
}

export function parsePicklistDetailData(data: unknown): ParsedPicklistDetail {
  let remark = '';
  if (data && !Array.isArray(data) && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    remark = extractRemarkFromCpkRow(obj);
    const meta = obj.Meta as PicklistDetailMeta | undefined;
    if (meta?.RequestBy) remark = String(meta.RequestBy);
  }
  let items = normalizeDetailItems(data);
  const requestBy = extractRequestByFromItems(items);
  if (requestBy) remark = requestBy;
  items = stripPicklistMetaLines(items);
  return { items, remark };
}

export function extractDetailMeta(data: unknown): PicklistDetailMeta | null {
  if (!data || Array.isArray(data) || typeof data !== 'object') return null;
  const meta = (data as Record<string, unknown>).Meta;
  return meta && typeof meta === 'object' ? (meta as PicklistDetailMeta) : null;
}

export function filterRequiredOnlyLines(items: PicklistRow[]): PicklistRow[] {
  return items.filter((row) => parseReqQtyNumericFromSapInfo(pickField(row, ['SAP_Info', 'SAPInfo'])) !== null);
}

export function getLinePart(row: PicklistRow): string {
  return String(pickField(row, ['HanaPart', 'PartNumber', 'MatNumber', 'Material']) || '').trim();
}

export function isAlreadyIssuedMessage(msg: unknown): boolean {
  const m = String(msg ?? '').toLowerCase();
  return (
    m.includes('already issued') ||
    m.includes('ถูกจ่าย') ||
    m.includes('จ่ายกับ picklist')
  );
}

export function extractPuidFromMessage(msg: unknown, fallback: string): string {
  const m = String(msg ?? '');
  const paren = m.match(/\(([A-Z0-9]+)\)/i);
  if (paren?.[1]) return normalizePuid(paren[1]);
  return normalizePuid(fallback);
}

export type IssueStateLabel = 'complete' | 'partial' | 'open' | 'loading';

export function issueStateLabelKey(state: IssueStateLabel): string {
  switch (state) {
    case 'complete':
      return 'pages:picklistIssueComplete';
    case 'partial':
      return 'pages:picklistIssuePartial';
    case 'loading':
      return 'common:loading';
    default:
      return 'pages:picklistIssueAwaiting';
  }
}

export function lineStatusKey(row: PicklistRow): string | null {
  if (lineIsIssued(row)) return 'pages:picklistLineIssued';
  if (lineIsInactiveBomRow(row) || linePuidIsXMark(row)) return null;
  const st = String(pickField(row, ['PicklistStatus', 'Status', 'LineStatus', 'ItemStatus']) || '');
  if (st.toLowerCase().includes('rush')) return 'pages:picklistRush';
  return 'pages:picklistOpen';
}
