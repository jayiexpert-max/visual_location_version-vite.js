export type PicklistRow = Record<string, unknown>;

export function pickField(row: PicklistRow | null | undefined, keys: string[]): unknown {
  if (!row) return '';
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return '';
}

export function parseSapReqQtyNumeric(sapInfo: unknown): number | null {
  const m = String(sapInfo ?? '').match(/_\{([0-9]+(?:[.,][0-9]+)?)\}\s*$/);
  if (!m) return null;
  const qty = parseFloat(m[1].replace(',', '.'));
  return qty > 0 ? qty : null;
}

export function lineIsRequired(row: PicklistRow): boolean {
  const sap = pickField(row, ['SAP_Info', 'SAPInfo']);
  return parseSapReqQtyNumeric(sap) !== null;
}

export function filterRequiredOnlyLines(lines: PicklistRow[]): PicklistRow[] {
  return lines.filter(lineIsRequired);
}

export function extractDetailLines(data: unknown): PicklistRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as PicklistRow[];
  const obj = data as Record<string, unknown>;
  for (const key of ['Lines', 'Items', 'Materials', 'PicklistItems']) {
    const arr = obj[key];
    if (Array.isArray(arr)) return arr as PicklistRow[];
  }
  return [];
}

export function isRequiredOnlyServiceError(message: unknown): boolean {
  const m = String(message ?? '').toUpperCase();
  return m.includes('ERR_CODE#00008') || m.includes('CATCH ERROR ON SERVICE');
}

function isMetaLine(row: PicklistRow): boolean {
  const part = String(
    pickField(row, ['PartNumber', 'HanaPart', 'MatNumber', 'Material']) || '',
  ).trim();
  if (!part) return false;
  const lower = part.toLowerCase();
  return (
    lower === 'request by' ||
    lower === 'requestby' ||
    lower === 'kitting room notes' ||
    lower === 'kitting notes' ||
    lower === 'notes' ||
    lower === 'remark' ||
    lower === 'requester'
  );
}

export function stripMetaLines(lines: PicklistRow[]): PicklistRow[] {
  const out = lines.slice();
  while (out.length && isMetaLine(out[out.length - 1])) {
    out.pop();
  }
  return out;
}

export function extractRequestBy(lines: PicklistRow[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const part = String(
      pickField(lines[i], ['PartNumber', 'HanaPart', 'MatNumber', 'Material']) || '',
    )
      .trim()
      .toLowerCase();
    if (part === 'request by' || part === 'requestby') {
      const remark = pickField(lines[i], [
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
  return null;
}
