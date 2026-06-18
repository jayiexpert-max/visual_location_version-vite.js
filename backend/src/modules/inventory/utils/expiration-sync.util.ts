export const EXPIRATION_SYNC_NEAR_DAYS = 7;
export const PDSERVICE_BACKFILL_LIMIT = 12;

export function expirationSyncNearDays(): number {
  return EXPIRATION_SYNC_NEAR_DAYS;
}

export function expireToSql(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return null;
}

export function expirationDateInSyncScope(dateSql: string | null | undefined): boolean {
  const normalized = expireToSql(dateSql);
  if (!normalized) return false;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + EXPIRATION_SYNC_NEAR_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return normalized <= cutoffStr;
}

export function partNumberFromSearch(search: string): string {
  const trimmed = search.trim();
  if (!trimmed || trimmed.includes('%') || trimmed.includes(' ')) {
    return '';
  }

  if (trimmed.length >= 10 || /IST|COM|CAP|RES/i.test(trimmed)) {
    return trimmed;
  }

  return '';
}

export function normalizeResNoInput(value: string): string {
  return value.trim().toUpperCase().replace(/^RES/i, '');
}

export function cpkStationRowEffectiveRemain(row: Record<string, unknown>): number | null {
  let original: number | null = null;
  for (const key of ['OriginalQty', 'Qty', 'OriginalQuantity']) {
    const val = row[key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      original = val;
      break;
    }
    if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) {
      original = Number(val);
      break;
    }
  }

  let quantity: number | null = null;
  for (const key of ['Quantity', 'QtyRemain', 'Correction']) {
    const val = row[key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      quantity = val;
      break;
    }
    if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) {
      quantity = Number(val);
      break;
    }
  }

  if (original != null && quantity != null && quantity < 0) {
    const effective = original + quantity;
    return effective > 0 ? Math.round(effective) : null;
  }

  if (quantity != null && quantity > 0) {
    return Math.round(quantity);
  }

  if (original != null && original > 0) {
    return Math.round(original);
  }

  return null;
}

export function normalizeCpkItemList(value: unknown): Record<string, unknown>[] {
  if (value == null || value === '') return [];
  if (!Array.isArray(value)) {
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      for (const key of ['Item', 'Items', 'InventoryItem']) {
        if (obj[key] != null) {
          return normalizeCpkItemList(obj[key]);
        }
      }
      if (obj.PUID != null || obj.PartNumber != null) {
        return [obj];
      }
    }
    return [];
  }

  if (value.length === 0) return [];
  return value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
}

export function normalizeCpkPuidList(value: unknown): Record<string, unknown>[] {
  if (value == null || value === '') return [];
  if (!Array.isArray(value)) {
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (obj.PUID != null) return [obj];
      for (const key of ['PUID', 'Item', 'Items']) {
        if (obj[key] != null) {
          return normalizeCpkPuidList(obj[key]);
        }
      }
    }
    return [];
  }

  return value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
}

export interface ResPuidSyncRow {
  puid: string;
  partNumber: string;
  qtyRemain: number;
  expire: string | null;
  batch: string;
  itemNo: string;
}

export function extractResPuidRows(resPayload: Record<string, unknown>): ResPuidSyncRow[] {
  const rows: ResPuidSyncRow[] = [];
  const items = normalizeCpkItemList(resPayload.Items ?? resPayload.items);

  for (const item of items) {
    const partNumber = String(
      item.PartNumber ?? item.MatNumber ?? item.HanaPart ?? '',
    ).trim();
    const itemNo = String(item.ItemNo ?? item.ItemNumber ?? '').trim();

    for (const p of normalizeCpkPuidList(item.PUIDList ?? item.PuidList)) {
      const puid = String(p.PUID ?? '').trim();
      if (!puid) continue;

      const expireRaw = p.ExpireDate ?? p.ExpirationDate ?? p.ExpDate ?? null;
      rows.push({
        puid,
        partNumber,
        qtyRemain: Number(p.QtyRemain ?? p.Quantity ?? p.Qty ?? 0) || 0,
        expire: expireToSql(expireRaw),
        batch: String(p.BatchNumber ?? p.LotNo ?? '').trim(),
        itemNo,
      });
    }
  }

  return rows;
}

export function normalizeResInfoPayload(payload: Record<string, unknown>): Record<string, unknown> {
  let merged = { ...payload };
  if (merged.Data && typeof merged.Data === 'object' && !Array.isArray(merged.Data)) {
    merged = { ...merged, ...(merged.Data as Record<string, unknown>) };
  }

  for (const altKey of ['ReservationItems', 'ReservationItem', 'RESItems']) {
    if (!merged.Items && merged[altKey]) {
      merged.Items = merged[altKey];
    }
  }

  const items = normalizeCpkItemList(merged.Items).map((item) => ({
    ...item,
    PUIDList: normalizeCpkPuidList(item.PUIDList ?? item.PuidList),
  }));

  return { ...merged, Items: items };
}
