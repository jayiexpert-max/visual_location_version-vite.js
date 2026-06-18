import * as inventoryService from '../services/inventoryService';
import type { CpkPicklistLine } from '../types/cpk';
import { lineShowsOpenStatus, normalizePuid, type PicklistRow } from './picklistIssueUtils';

export interface PicklistPrecheckResult {
  ok: boolean;
  message?: string;
  part?: string;
  pdserviceOffline?: boolean;
  meta?: inventoryService.InventoryLookupData;
}

function buildOpenParts(lines: PicklistRow[]): { open: Set<string>; all: Set<string> } {
  const open = new Set<string>();
  const all = new Set<string>();
  for (const line of lines) {
    const part = String(
      line.HanaPart ?? line.PartNo ?? line.PartNumber ?? line.Material ?? '',
    ).trim();
    if (!part) continue;
    all.add(part);
    if (lineShowsOpenStatus(line)) open.add(part);
  }
  return { open, all };
}

export async function precheckIssuePuid(
  puid: string,
  lines: CpkPicklistLine[] | PicklistRow[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): Promise<PicklistPrecheckResult> {
  const normalized = normalizePuid(puid);
  if (!normalized) {
    return { ok: false, message: t('pages:picklistPrecheckScanFirst') };
  }

  let lookup: inventoryService.InventoryLookupResponse;
  try {
    lookup = await inventoryService.lookupPuid(normalized);
  } catch {
    return { ok: false, message: t('pages:picklistPrecheckVerifyFail') };
  }

  if (lookup.status !== 'success' || !lookup.data) {
    return { ok: false, message: t('pages:picklistPrecheckNotFound') };
  }

  const part = String(lookup.data.HanaPart ?? '').trim();
  const remain = Number(lookup.data.QtyRemain ?? 0);
  const status = String(lookup.data.StatusName ?? '');

  if (!part || remain <= 0 || /withdrawn|empty/i.test(status)) {
    return { ok: false, message: t('pages:picklistPrecheckNoStock') };
  }

  const { open, all } = buildOpenParts(lines);
  if (!open.has(part)) {
    if (all.has(part)) {
      return { ok: false, message: t('pages:picklistPrecheckPartDone', { part }) };
    }
    return { ok: false, message: t('pages:picklistPrecheckPartNotOnList', { part }) };
  }

  return {
    ok: true,
    part,
    pdserviceOffline: lookup.pdserviceOffline,
    meta: lookup.data,
  };
}
