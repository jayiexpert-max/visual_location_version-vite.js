import type { BoxLayoutPuid } from '../types/warehouse';

/** Normalize hierarchy preview strings or API objects to BoxLayoutPuid[]. */
export function normalizeBoxLayoutPuids(
  puids?: Array<string | BoxLayoutPuid>,
): BoxLayoutPuid[] {
  if (!puids?.length) return [];
  return puids.map((item) =>
    typeof item === 'string' ? { puid: item } : item,
  );
}

export function boxLayoutPuidClass(item: BoxLayoutPuid): string {
  if (item.isExpired) return 'rack-puid-tag--expired';
  if (item.isNearExpiry) return 'rack-puid-tag--near';
  return '';
}
