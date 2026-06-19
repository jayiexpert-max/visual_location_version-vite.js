/** Port of PHP public/assets/picklist-notify.js */

import i18n from '../locales/i18n';

const STORAGE_KEY = 'fx_known_picklist_ids';

export type PicklistIssueState = 'open' | 'partial' | 'complete';

type PicklistRow = Record<string, unknown>;

function pickField(row: PicklistRow | null | undefined, keys: string[]): unknown {
  if (!row) return '';
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return '';
}

export function picklistIdFromRow(row: PicklistRow): string {
  const id = pickField(row, ['PicklistID', 'Picklist#', 'PicklistNo', 'Picklist']);
  return id ? String(id).trim() : '';
}

function normalizePuid(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/^VL/, '');
}

function lineIssuedPuid(row: PicklistRow): string {
  return normalizePuid(pickField(row, ['PUID', 'IssuedPUID', 'PUIDIssued', 'Issued_PUID', 'puid']));
}

function statusImpliesComplete(st: string): boolean {
  const s = st.toLowerCase();
  return (
    s.includes('complete') ||
    s.includes('issued') ||
    s.includes('done') ||
    s.includes('closed') ||
    s === 'c' ||
    s.includes('จ่ายสำเร็จ') ||
    s.includes('จ่ายแล้ว') ||
    s.includes('จ่ายครบ') ||
    s.includes('เสร็จ')
  );
}

function parseReqQtyNumericFromSapInfo(sapInfo: unknown): number | null {
  const m = String(sapInfo ?? '').match(/_\{([0-9]+(?:[.,][0-9]+)?)\}\s*$/);
  if (!m) return null;
  const qty = parseFloat(m[1].replace(',', '.'));
  return qty > 0 ? qty : null;
}

function lineRequiredQtyNumeric(row: PicklistRow): number {
  const sap = pickField(row, ['SAP_Info', 'SAPInfo']);
  const fromSap = parseReqQtyNumericFromSapInfo(sap);
  if (fromSap !== null) return fromSap;
  return parseFloat(String(pickField(row, ['QtyRequired', 'RequiredQty', 'ReqQty', 'Qty', 'Quantity']) || 0)) || 0;
}

function lineIsIssued(row: PicklistRow): boolean {
  const puid = lineIssuedPuid(row);
  if (puid.length >= 4) return true;
  const st = String(pickField(row, ['PicklistStatus', 'Status', 'LineStatus', 'ItemStatus']) || '');
  if (statusImpliesComplete(st)) return true;
  const req = lineRequiredQtyNumeric(row);
  const iss = parseFloat(String(pickField(row, ['QtyIssued', 'IssuedQty', 'Issued']) || 0)) || 0;
  return req > 0 && iss >= req;
}

function lineIsInactiveBomRow(row: PicklistRow): boolean {
  return lineRequiredQtyNumeric(row) <= 0;
}

function linePuidIsXMark(row: PicklistRow): boolean {
  return String(pickField(row, ['PUID', 'IssuedPUID', 'PUIDIssued', 'Issued_PUID', 'puid']) || '')
    .trim()
    .toLowerCase() === 'x';
}

function lineShowsOpenStatus(row: PicklistRow): boolean {
  if (lineIsIssued(row)) return false;
  if (lineIsInactiveBomRow(row)) return false;
  if (linePuidIsXMark(row)) return false;
  return true;
}

export function issueStateFromItems(items: PicklistRow[]): PicklistIssueState {
  if (!items.length) return 'open';
  if (!items.some(lineShowsOpenStatus)) return 'complete';
  if (items.some(lineIsIssued)) return 'partial';
  return 'open';
}

export function issueStateFromHeader(row: PicklistRow): PicklistIssueState | null {
  const nested = (row.items ?? row.Items ?? row.Lines ?? row.Materials ?? row.PicklistItems) as
    | PicklistRow[]
    | undefined;
  if (Array.isArray(nested) && nested.length) return issueStateFromItems(nested);

  const st = String(pickField(row, ['Status', 'PicklistStatus', 'State', 'IssueStatus']) || '');
  if (statusImpliesComplete(st)) return 'complete';
  const lower = st.toLowerCase();
  if (lower.includes('partial') || lower.includes('progress')) return 'partial';
  return null;
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

function resolveIssueState(row: PicklistRow, stateMap?: Record<string, PicklistIssueState>): PicklistIssueState {
  const id = picklistIdFromRow(row);
  if (stateMap && id && stateMap[id]) return stateMap[id];
  const fromHeader = issueStateFromHeader(row);
  if (fromHeader !== null) return fromHeader;
  return 'open';
}

export function countPendingPicklists(
  picklists: PicklistRow[],
  stateMap?: Record<string, PicklistIssueState>,
): number {
  return picklists.filter((row) => resolveIssueState(row, stateMap) !== 'complete').length;
}

export async function enrichPicklistIssueStates(
  list: PicklistRow[],
  stateMap: Record<string, PicklistIssueState>,
  fetchDetail: (picklistId: string) => Promise<PicklistRow[]>,
  concurrency = 4,
): Promise<void> {
  const tasks = list.map((row) => async () => {
    const id = picklistIdFromRow(row);
    if (!id) return;
    const fromHeader = issueStateFromHeader(row);
    if (fromHeader === 'complete') {
      stateMap[id] = 'complete';
      return;
    }
    if (stateMap[id] === 'complete') return;
    try {
      const items = await fetchDetail(id);
      stateMap[id] = issueStateFromItems(items);
    } catch {
      stateMap[id] = fromHeader ?? stateMap[id] ?? 'open';
    }
  });

  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const fn = tasks[index++];
      await fn();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
}

function extractPendingIds(picklists: PicklistRow[], stateMap?: Record<string, PicklistIssueState>): string[] {
  return picklists
    .filter((row) => resolveIssueState(row, stateMap) !== 'complete')
    .map((row) => picklistIdFromRow(row))
    .filter(Boolean);
}

function loadKnownIds(): string[] | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

function saveKnownIds(ids: string[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function detectNewPicklistIds(
  picklists: PicklistRow[],
  stateMap?: Record<string, PicklistIssueState>,
): string[] {
  const current = extractPendingIds(picklists, stateMap);
  const known = loadKnownIds();
  if (known === null) {
    saveKnownIds(current);
    return [];
  }
  const knownSet = new Set(known);
  const fresh = current.filter((id) => !knownSet.has(id));
  saveKnownIds(current);
  return fresh;
}

let audioCtx: AudioContext | null = null;

function ensureAudio(): AudioContext | null {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  }
  try {
    audioCtx = new AudioContext();
    return audioCtx;
  } catch {
    return null;
  }
}

export function playPicklistBeep(): void {
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const pattern = [740, 988, 1175];
  pattern.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    const t0 = now + i * 0.16;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.26, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
    osc.start(t0);
    osc.stop(t0 + 0.15);
  });
}

export function speakNewPicklists(newIds: string[]): void {
  if (!('speechSynthesis' in window) || !newIds.length) return;
  window.speechSynthesis.cancel();
  const msg =
    newIds.length === 1
      ? i18n.t('pages:apiMsgPicklistNewSystemMessageSingle', { id: newIds[0] })
      : i18n.t('pages:apiMsgPicklistNewSystemMessageMulti', { count: newIds.length });
  const utter = new SpeechSynthesisUtterance(msg);
  utter.lang = i18n.language?.startsWith('en') ? 'en-US' : 'th-TH';
  utter.rate = i18n.language?.startsWith('en') ? 0.92 : 0.88;
  utter.pitch = 1.05;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

export function alertNewPicklists(newIds: string[]): void {
  if (!newIds.length) return;
  playPicklistBeep();
  speakNewPicklists(newIds);
}

export function bindPicklistAudioUnlock(): () => void {
  const unlock = () => {
    ensureAudio();
    document.removeEventListener('click', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('click', unlock);
  document.addEventListener('keydown', unlock);
  return () => {
    document.removeEventListener('click', unlock);
    document.removeEventListener('keydown', unlock);
  };
}
