import { getErrorMessage } from '../services/apiClient';
import * as inventoryService from '../services/inventoryService';
import type { HighlightLocationResponse } from '../services/inventoryService';
import * as tvService from '../services/tvService';

let highlightInFlight = false;

export function isHandheldHighlightBusy(): boolean {
  return highlightInFlight;
}

export function normalizeHandheldHighlightQuery(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/^VL/i, '');
}

function formatHighlightLocation(res: HighlightLocationResponse): string {
  const loc = res.location;
  return [
    loc.rackName,
    loc.levelNo != null ? `L${loc.levelNo}` : '',
    loc.boxCode,
    loc.slotNo != null ? `S${loc.slotNo}` : '',
  ]
    .filter(Boolean)
    .join(' / ');
}

export interface HandheldHighlightResult {
  ok: boolean;
  busy?: boolean;
  query?: string;
  location?: string;
  puid?: string | null;
  error?: string;
}

export async function sendHandheldHighlight(query: string): Promise<HandheldHighlightResult> {
  const normalized = normalizeHandheldHighlightQuery(query);
  if (!normalized) {
    return { ok: false, error: 'empty' };
  }
  if (highlightInFlight) {
    return { ok: false, busy: true, query: normalized };
  }

  highlightInFlight = true;
  try {
    const res = await inventoryService.highlightLocation({ query: normalized });
    return {
      ok: true,
      query: res.tv.productName ?? normalized,
      location: formatHighlightLocation(res),
      puid: res.tv.puid ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      query: normalized,
      error: getErrorMessage(err, 'Location not found'),
    };
  } finally {
    highlightInFlight = false;
  }
}

/** TV + 3D + IO — highlight warehouse location for handheld save/issue flows. */
export async function sendHandheldLocationHighlight(
  meta: inventoryService.InventoryLookupData,
  options?: {
    partName?: string;
    actionType?: string;
    query?: string;
  },
): Promise<void> {
  const partName = options?.partName ?? meta.HanaPart;
  const actionType = options?.actionType ?? 'highlight';
  const query =
    normalizeHandheldHighlightQuery(options?.query ?? meta.PUID) ||
    normalizeHandheldHighlightQuery(partName);

  if (!query) return;

  if (meta.slot_id) {
    try {
      await inventoryService.highlightLocation({ query, slotId: meta.slot_id });
      return;
    } catch {
      // fall through
    }
  }

  try {
    await inventoryService.highlightLocation({ query });
    return;
  } catch {
    // fall through to direct TV payload or search-resolve
  }

  if (meta.box_id) {
    await tvService.setTvHighlight({
      productName: partName,
      puid: meta.PUID,
      boxId: meta.box_id,
      slotId: meta.slot_id || undefined,
      slotNo: meta.Loc_Slot || undefined,
      rackName: meta.Loc_Shelf,
      levelNo: Number(meta.Loc_Level) || undefined,
      boxCode: meta.Loc_Box,
      qty: meta.QtyRemain ?? meta.Qty ?? 0,
      actionType,
    });
    return;
  }

  const resolved = await inventoryService.searchResolve(query);
  if (resolved.status === 'success' && resolved.data) {
    const data = resolved.data;
    await inventoryService.highlightLocation({
      query: data.hanaPart || query,
      slotId: data.slotId,
    });
  }
}

/** TV + 3D + IO after receive — uses lookup meta when available. */
export async function sendHandheldReceiveHighlight(
  meta: inventoryService.InventoryLookupData,
  partName?: string,
): Promise<void> {
  await sendHandheldLocationHighlight(meta, {
    partName,
    actionType: 'receive',
  });
}

/** TV + 3D + IO after picklist issue — shows where PUID was taken from. */
export async function sendHandheldPicklistIssueHighlight(
  meta: inventoryService.InventoryLookupData,
  partName?: string,
): Promise<void> {
  await sendHandheldLocationHighlight(meta, {
    partName,
    actionType: 'picklist',
  });
}
