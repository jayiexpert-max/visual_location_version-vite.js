/**
 * Shared slot grid mapping — same rules as PHP rack-slot-layout.js / search_product.php.
 * Layout WxH: W = columns (left→right), visual rows = ceil(totalSlots / W).
 * Slot 1 (index 0) = bottom-left in 2D grid.
 */

export function rackSlotGridCols(layout: string): number {
  const s = String(layout || '1x1').toLowerCase();
  if (!s.includes('x')) return 1;
  const n = parseInt(s.split('x')[0], 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function rackSlotGridRows(layout: string, totalSlots: number): number {
  const cols = rackSlotGridCols(layout);
  const total = Math.max(1, totalSlots);
  return Math.max(1, Math.ceil(total / cols));
}

/** Visual grid row 0 = top, col 0 = left (CSS grid order). */
export function rackSlotIndexFromGrid(col: number, visRow: number, gridRows: number): number {
  return col * gridRows + (gridRows - 1 - visRow);
}

export function rackSlotGridFromIndex(index: number, gridRows: number): { col: number; visRow: number } {
  const col = Math.floor(index / gridRows);
  const visRow = gridRows - 1 - (index % gridRows);
  return { col, visRow };
}

/** Box-local 3D: -X left, -Z front (label face). */
export function rackSlotPosition3D(
  col: number,
  visRow: number,
  gridCols: number,
  gridRows: number,
  innerSize: number,
): { x: number; z: number; cellW: number; cellD: number } {
  const cellW = innerSize / gridCols;
  const cellD = innerSize / gridRows;
  const startX = -(innerSize / 2);
  const startZ = -(innerSize / 2);
  const depth = gridRows - 1 - visRow;

  return {
    x: startX + col * cellW + cellW / 2,
    z: startZ + depth * cellD + cellD / 2,
    cellW,
    cellD,
  };
}

export interface RackSlotGridCell {
  col: number;
  visRow: number;
  slotIndex: number;
  gridCols: number;
  gridRows: number;
}

export function rackSlotGridCells(layout: string, totalSlots: number): RackSlotGridCell[] {
  const gridCols = rackSlotGridCols(layout);
  const gridRows = rackSlotGridRows(layout, totalSlots);
  const cells: RackSlotGridCell[] = [];

  for (let visRow = 0; visRow < gridRows; visRow += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      cells.push({
        col,
        visRow,
        slotIndex: rackSlotIndexFromGrid(col, visRow, gridRows),
        gridCols,
        gridRows,
      });
    }
  }

  return cells;
}

/** Order slots for CSS grid display (top→bottom, left→right). */
export function arrangeSlotsByLayout<T>(slots: T[], layout: string): Array<T | null> {
  const gridCols = rackSlotGridCols(layout);
  const gridRows = rackSlotGridRows(layout, slots.length);
  const arranged: Array<T | null> = [];

  for (let visRow = 0; visRow < gridRows; visRow += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      const slotIndex = rackSlotIndexFromGrid(col, visRow, gridRows);
      arranged.push(slots[slotIndex] ?? null);
    }
  }

  return arranged;
}
