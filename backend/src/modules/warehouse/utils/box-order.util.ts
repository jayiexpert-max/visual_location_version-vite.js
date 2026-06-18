type BoxOrderInput = {
  id: number;
  boxCode?: string | null;
  positionInLevel?: number | null;
};

function boxCodeSortValue(code: string | null | undefined): number {
  if (!code) return Number.MAX_SAFE_INTEGER;
  const trimmed = code.trim();
  const numeric = Number.parseInt(trimmed, 10);
  if (Number.isFinite(numeric) && String(numeric) === trimmed) {
    return numeric;
  }
  return Number.MAX_SAFE_INTEGER;
}

/** Stable left-to-right order: position_in_level, then numeric box_code, then id. */
export function compareBoxesInLevel(a: BoxOrderInput, b: BoxOrderInput): number {
  const posA = a.positionInLevel;
  const posB = b.positionInLevel;

  if (posA != null && posB != null && posA !== posB) {
    return posA - posB;
  }
  if (posA != null && posB == null) return -1;
  if (posA == null && posB != null) return 1;

  const codeDiff = boxCodeSortValue(a.boxCode) - boxCodeSortValue(b.boxCode);
  if (codeDiff !== 0) return codeDiff;

  return a.id - b.id;
}

export function sortBoxesInLevel<T extends BoxOrderInput>(boxes: T[]): T[] {
  return [...boxes].sort(compareBoxesInLevel);
}
