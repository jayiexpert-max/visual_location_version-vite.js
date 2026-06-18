export type CpkRecord = Record<string, unknown>;

export function normalizeResNo(value: string): string {
  return value.trim().toUpperCase().replace(/^RES/i, '');
}

export function normalizePuidInput(puid: string): string {
  return puid.trim().toUpperCase().replace(/^VL/i, '');
}

export function puidLookupCandidates(puid: string): string[] {
  const trimmed = puid.trim();
  if (!trimmed) return [];

  const stripped = normalizePuidInput(trimmed);

  return [...new Set([trimmed, trimmed.toUpperCase(), stripped, stripped ? `VL${stripped}` : ''].filter(Boolean))];
}

export function cpkIsPuidReceivedFlag(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'boolean') return value;
  const v = String(value).toUpperCase().trim();
  return ['Y', 'YES', 'TRUE', '1', 'R', 'RECEIVED', 'DONE'].includes(v);
}

export function cpkPuidQtyRemain(row: CpkRecord): number | null {
  for (const key of ['QtyRemain', 'Quantity', 'Qty', 'OriginalQty', 'RemainQty', 'MatQty']) {
    const raw = row[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const v = Number(raw);
    if (!Number.isNaN(v) && v > 0) return Math.round(v);
  }
  return null;
}

export function cpkItemRequestQty(item: CpkRecord): number | null {
  for (const key of ['RequestQty', 'MatReqQty', 'ReqQty', 'RequiredQty', 'Quantity', 'MatQty']) {
    const raw = item[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const v = Number(raw);
    if (!Number.isNaN(v) && v > 0) return Math.round(v);
  }
  return null;
}

export function normalizePuidRow(row: unknown): CpkRecord {
  if (typeof row === 'string') return { PUID: row.trim() };
  if (!row || typeof row !== 'object') return { PUID: '' };

  const record = { ...(row as CpkRecord) };
  if (!record.PUID && record.PublicUID) {
    record.PUID = record.PublicUID;
  }
  if (record.QtyRemain === undefined || record.QtyRemain === null || record.QtyRemain === '') {
    const qty = cpkPuidQtyRemain(record);
    if (qty !== null) record.QtyRemain = qty;
  }
  return record;
}

export function cpkAsPuidList(value: unknown): CpkRecord[] {
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'string') return [normalizePuidRow(value)];
  if (!Array.isArray(value)) {
    if (typeof value !== 'object') return [];
    const obj = value as CpkRecord;
    if (Array.isArray(obj.PUID) && !obj.Received && !obj.BatchNumber) {
      return cpkAsPuidList(obj.PUID);
    }
    for (const key of ['ReservationPUID', 'PUIDItem', 'Item']) {
      if (obj[key] !== undefined) return cpkAsPuidList(obj[key]);
    }
    if (obj.PUID || obj.Received || obj.BatchNumber) return [normalizePuidRow(obj)];
    return Object.values(obj)
      .filter((row) => typeof row === 'object' || typeof row === 'string')
      .map(normalizePuidRow);
  }
  return value.map(normalizePuidRow);
}

export function cpkAsItemList(value: unknown): CpkRecord[] {
  if (value === null || value === undefined || value === '') return [];
  if (!Array.isArray(value)) {
    if (typeof value !== 'object') return [];
    const obj = value as CpkRecord;
    if (obj.PartNumber || obj.ItemNo || obj.MatNumber) return [obj];
    for (const key of ['Item', 'ReservationItem', 'Items', 'Material', 'Detail', 'Line']) {
      if (obj[key] !== undefined) return cpkAsItemList(obj[key]);
    }
    return Object.values(obj).filter((row): row is CpkRecord => typeof row === 'object' && row !== null);
  }
  return value.filter((row): row is CpkRecord => typeof row === 'object' && row !== null);
}

export function normalizeResInfo(payload: CpkRecord): CpkRecord {
  let data = { ...payload };
  if (data.Data && typeof data.Data === 'object') {
    data = { ...data, ...(data.Data as CpkRecord) };
  }

  for (const altKey of ['ReservationItems', 'ReservationItem', 'RESItems']) {
    if (!data.Items && data[altKey]) {
      data.Items = data[altKey];
    }
  }

  const items = cpkAsItemList(data.Items ?? []).map((item) => ({
    ...item,
    PUIDList: cpkAsPuidList(item.PUIDList ?? []),
  }));

  return { ...data, Items: items };
}
