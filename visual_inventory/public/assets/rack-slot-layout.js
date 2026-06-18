/**
 * Shared slot grid mapping — same rules as search_product.php showModal.
 * Layout WxH: W = columns (left→right), rows derived from slot count.
 * Slot 1 (index 0) = bottom-left in 2D grid = front-left on box (-X, -Z).
 */
(function (global) {
    function rackSlotGridCols(layout) {
        const s = String(layout || '1x1').toLowerCase();
        if (!s.includes('x')) {
            return 1;
        }
        const n = parseInt(s.split('x')[0], 10);
        return Number.isFinite(n) && n > 0 ? n : 1;
    }

    function rackSlotGridRows(layout, totalSlots) {
        const cols = rackSlotGridCols(layout);
        const total = Math.max(1, parseInt(totalSlots, 10) || 1);
        return Math.max(1, Math.ceil(total / cols));
    }

    /** Visual grid row 0 = top, col 0 = left (CSS grid order). */
    function rackSlotIndexFromGrid(col, visRow, gridRows) {
        return (col * gridRows) + (gridRows - 1 - visRow);
    }

    /**
     * @returns {Array<{col:number,visRow:number,slotIndex:number}>}
     */
    function rackSlotGridCells(layout, totalSlots) {
        const gridCols = rackSlotGridCols(layout);
        const gridRows = rackSlotGridRows(layout, totalSlots);
        const cells = [];

        for (let visRow = 0; visRow < gridRows; visRow++) {
            for (let col = 0; col < gridCols; col++) {
                cells.push({
                    col: col,
                    visRow: visRow,
                    slotIndex: rackSlotIndexFromGrid(col, visRow, gridRows),
                    gridCols: gridCols,
                    gridRows: gridRows
                });
            }
        }

        return cells;
    }

    /** Box-local 3D: -X left, -Z front (label face). */
    function rackSlotPosition3D(col, visRow, gridCols, gridRows, innerSize) {
        const cellW = innerSize / gridCols;
        const cellD = innerSize / gridRows;
        const startX = -(innerSize / 2);
        const startZ = -(innerSize / 2);
        const depth = gridRows - 1 - visRow;

        return {
            x: startX + (col * cellW) + (cellW / 2),
            z: startZ + (depth * cellD) + (cellD / 2),
            cellW: cellW,
            cellD: cellD
        };
    }

    global.RackSlotLayout = {
        gridCols: rackSlotGridCols,
        gridRows: rackSlotGridRows,
        indexFromGrid: rackSlotIndexFromGrid,
        gridCells: rackSlotGridCells,
        position3D: rackSlotPosition3D
    };
})(typeof window !== 'undefined' ? window : globalThis);
