export interface CpkReservationMaterial {
  hanaPart: string;
  description: string;
  qty: number;
  im?: string;
  lotNo?: string;
}

export interface CpkReservationInfo {
  resNo: string;
  status?: string;
  store?: string;
  reqDate?: string;
  materials: CpkReservationMaterial[];
  raw: Record<string, unknown>;
}

function readString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

function normalizeMaterial(raw: unknown): CpkReservationMaterial | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const hanaPart = readString(
    record,
    'HanaPart',
    'HANA_Part',
    'PartNo',
    'MaterialCode',
    'hanaPart',
    'partNo',
  );
  if (!hanaPart) return null;

  return {
    hanaPart,
    description: readString(record, 'Description', 'MaterialDesc', 'description', 'PartName'),
    qty: readNumber(record, 'Qty', 'QTY', 'RequiredQty', 'qty', 'Quantity'),
    im: readString(record, 'IM', 'im') || undefined,
    lotNo: readString(record, 'LotNo', 'Lot', 'lotNo') || undefined,
  };
}

function extractMaterialArray(data: Record<string, unknown>): unknown[] {
  const arrayKeys = [
    'Materials',
    'ResMaterials',
    'MaterialList',
    'ResMatList',
    'Details',
    'ResDetails',
    'Items',
    'Data',
    'ResMaterial',
  ];

  for (const key of arrayKeys) {
    const value = data[key];
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }
  }

  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      return value;
    }
  }

  return [];
}

export function parseCpkReservationInfo(
  keyword: string,
  cpkData: Record<string, unknown>,
  localReservation?: Record<string, unknown> | null,
): CpkReservationInfo {
  const materials = extractMaterialArray(cpkData)
    .map(normalizeMaterial)
    .filter((item): item is CpkReservationMaterial => item !== null);

  const local = localReservation ?? {};

  return {
    resNo:
      readString(cpkData, 'RES_NO', 'ResNo', 'ReservationNo', 'resNo') ||
      readString(local, 'resNo', 'res_no') ||
      keyword,
    status:
      readString(cpkData, 'Status', 'ResStatus', 'status') ||
      readString(local, 'status') ||
      undefined,
    store: readString(cpkData, 'Store', 'store') || readString(local, 'store') || undefined,
    reqDate:
      readString(cpkData, 'ReqDate', 'RequestDate', 'reqDate') ||
      readString(local, 'reqDate', 'req_date') ||
      undefined,
    materials,
    raw: cpkData,
  };
}

export function isCpkError(data: Record<string, unknown>): boolean {
  const status = String(data.Status ?? data.status ?? '').toUpperCase();
  return status === 'E';
}
