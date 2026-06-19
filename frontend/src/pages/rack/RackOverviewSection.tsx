import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GridViewIcon from '@mui/icons-material/GridView';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LayersIcon from '@mui/icons-material/Layers';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { CircularProgress } from '@mui/material';
import * as warehouseService from '../../services/warehouseService';
import { getErrorMessage } from '../../services/apiClient';
import type {
  BoxLayout,
  HierarchyBox,
  HierarchyLevel,
  HierarchyRack,
  WarehouseHierarchy,
} from '../../types/warehouse';
import { useSocketEvent } from '../../hooks/useSocket';
import { SocketEvents } from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';
import { BoxLayoutPanel } from './BoxLayoutPanel';
import { rackSlotGridCols, rackSlotGridFromIndex, rackSlotGridRows } from '../../utils/rackSlotLayout';

const ROWS_PER_PAGE = 10;

function boxQty(box: HierarchyBox): number {
  return box.slots.reduce((s, sl) => {
    const puidQty = sl.puids?.length ?? 0;
    return s + Math.max(sl.product?.qty ?? 0, puidQty);
  }, 0);
}

function rackStats(rack: HierarchyRack) {
  let totalQty = 0;
  let activeBoxes = 0;
  let totalBoxes = 0;
  for (const level of rack.levels) {
    for (const box of level.boxes) {
      totalBoxes++;
      const q = boxQty(box);
      totalQty += q;
      if (q > 0) activeBoxes++;
    }
  }
  return { totalQty, activeBoxes, totalBoxes };
}

function buildBoxLayoutPreview(
  rack: HierarchyRack,
  level: HierarchyLevel,
  box: HierarchyBox,
): BoxLayout {
  const sortedSlots = [...box.slots].sort((a, b) => a.slotNo - b.slotNo);
  const rows = rackSlotGridRows(box.layout, sortedSlots.length);
  const cols = rackSlotGridCols(box.layout);

  return {
    boxId: box.id,
    boxCode: box.boxCode,
    layout: box.layout,
    rows,
    cols,
    rackId: rack.id,
    rackName: rack.name,
    levelNo: level.levelNo,
    cells: sortedSlots.map((slot, index) => {
      const { col, visRow } = rackSlotGridFromIndex(index, rows);
      return {
        slotId: slot.id,
        slotNo: slot.slotNo,
        row: visRow + 1,
        col: col + 1,
        highlighted: false,
        puids: (slot.puids ?? []).map((puid) => ({ puid })),
        product: slot.product
          ? {
              id: slot.product.id,
              name: slot.product.name,
              qty: slot.product.qty,
            }
          : null,
      };
    }),
  };
}

function StatCard({
  icon,
  value,
  label,
  iconClass,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  iconClass: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconClass}`}>{icon}</div>
      <div className="stat-info">
        <h3>{value.toLocaleString()}</h3>
        <p>{label}</p>
      </div>
    </div>
  );
}

function BoxBadge({
  box,
  onSelect,
}: {
  box: HierarchyBox;
  onSelect: (box: HierarchyBox) => void;
}) {
  const qty = boxQty(box);
  const active = qty > 0;
  return (
    <button
      type="button"
      className={`box-item ${active ? 'status-active' : 'status-empty'}`}
      title={`Box: ${box.boxCode} | Qty: ${qty}`}
      onClick={() => onSelect(box)}
    >
      {box.boxCode}
      <span className={`box-badge ${active ? 'box-badge-active' : 'box-badge-empty'}`}>
        {qty}
      </span>
    </button>
  );
}

function GridView({
  hierarchy,
  onBoxSelect,
}: {
  hierarchy: WarehouseHierarchy;
  onBoxSelect: (box: HierarchyBox, initialLayout: BoxLayout) => void;
}) {
  return (
    <div className="rack-grid">
      {hierarchy.racks.map((rack) => (
        <div key={rack.id} className="rack-card">
          <div className="rack-header">Rack {rack.name}</div>
          <div className="rack-body">
            {rack.levels.map((level) => (
              <div key={level.id} className="level-row">
                <span className="level-label">Level {level.levelNo}</span>
                <div className="box-container">
                  {level.boxes.map((box) => (
                    <BoxBadge
                      key={box.id}
                      box={box}
                      onSelect={() => onBoxSelect(box, buildBoxLayoutPreview(rack, level, box))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface FlatRow {
  rack: HierarchyRack;
  level: HierarchyLevel;
  rackName: string;
  levelNo: number;
  box: HierarchyBox;
  qty: number;
  hanaParts: string[];
}

function buildFlatRows(hierarchy: WarehouseHierarchy): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const rack of hierarchy.racks) {
    for (const level of rack.levels) {
      for (const box of level.boxes) {
        const qty = boxQty(box);
        const parts = box.slots
          .filter(
            (s) =>
              s.product &&
              Math.max(s.product.qty, s.puids?.length ?? 0) > 0 &&
              s.product.name.trim(),
          )
          .map((s) => s.product!.name.trim());
        const unique = [...new Set(parts)];
        rows.push({ rack, level, rackName: rack.name, levelNo: level.levelNo, box, qty, hanaParts: unique });
      }
    }
  }
  return rows;
}

function TableView({
  hierarchy,
  onBoxSelect,
}: {
  hierarchy: WarehouseHierarchy;
  onBoxSelect: (box: HierarchyBox, initialLayout: BoxLayout) => void;
}) {
  const { t } = useTranslation(['pages', 'common']);
  const [page, setPage] = useState(1);
  const rows = useMemo(() => buildFlatRows(hierarchy), [hierarchy]);
  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);
  const sliced = rows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const pageNums = useMemo(() => {
    const nums: (number | 0)[] = [];
    const radius = 2;
    const start = Math.max(1, page - radius);
    const end = Math.min(totalPages, page + radius);
    if (start > 1) {
      nums.push(1);
      if (start > 2) nums.push(0);
    }
    for (let i = start; i <= end; i++) nums.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) nums.push(0);
      nums.push(totalPages);
    }
    return nums;
  }, [page, totalPages]);

  return (
    <div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Rack</th>
              <th>{t('pages:layout3dLevel')}</th>
              <th>{t('pages:searchBoxDetails')}</th>
              <th>HanaPart</th>
              <th>{t('pages:addStockQtyFull')}</th>
              <th>{t('common:status')}</th>
              <th>{t('common:manage')}</th>
            </tr>
          </thead>
          <tbody>
            {sliced.map(({ rack, level, rackName, levelNo, box, qty, hanaParts }) => {
              const preview = buildBoxLayoutPreview(rack, level, box);
              return (
                <tr key={box.id}>
                  <td>Rack {rackName}</td>
                  <td>Level {levelNo}</td>
                  <td style={{ fontWeight: 600 }}>{box.boxCode}</td>
                  <td style={{ fontSize: '0.9rem', color: '#334155', maxWidth: 280, wordBreak: 'break-word' }}>
                    {hanaParts.length ? hanaParts.join(', ') : '—'}
                  </td>
                  <td style={qty === 0 ? { color: '#ef4444', fontWeight: 700 } : {}}>
                    {qty.toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${qty > 0 ? 'badge-active' : 'badge-empty'}`}>
                      {qty > 0 ? t('pages:searchOccupied') : t('pages:searchNoProduct')}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-white"
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                      onClick={() => onBoxSelect(box, preview)}
                    >
                      {t('pages:searchBoxDetails')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-container">
          <button
            className={`page-btn${page <= 1 ? ' disabled' : ''}`}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeftIcon fontSize="small" />
          </button>
          {pageNums.map((p, i) =>
            p === 0 ? (
              <span key={`ellipsis-${i}`} className="page-ellipsis">
                …
              </span>
            ) : (
              <button
                key={p}
                className={`page-btn${p === page ? ' active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ),
          )}
          <button
            className={`page-btn${page >= totalPages ? ' disabled' : ''}`}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRightIcon fontSize="small" />
          </button>
        </div>
      )}
    </div>
  );
}

interface RackOverviewSectionProps {
  highlightBoxId?: number;
  highlightSlotId?: number;
  showTitle?: boolean;
  title?: string;
}

export function RackOverviewSection({
  highlightBoxId = 0,
  highlightSlotId = 0,
  showTitle = true,
  title,
}: RackOverviewSectionProps) {
  const { t } = useTranslation(['pages', 'common']);
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketAuth = useMemo(
    () => (accessToken ? { token: accessToken } : undefined),
    [accessToken],
  );

  const [hierarchy, setHierarchy] = useState<WarehouseHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const [selectedBox, setSelectedBox] = useState<HierarchyBox | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<BoxLayout | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const loadHierarchy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehouseService.getHierarchy();
      setHierarchy(data);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadHierarchy();
  }, [loadHierarchy]);

  useSocketEvent<{ boxId?: number }>(
    SocketEvents.inventoryUpdate,
    () => {
      void loadHierarchy();
    },
    true,
    socketAuth,
  );

  const stats = useMemo(() => {
    if (!hierarchy) return { totalProducts: 0, totalRacks: 0, totalBoxes: 0, activeBoxes: 0 };
    let totalProducts = 0;
    let totalBoxes = 0;
    let activeBoxes = 0;
    for (const rack of hierarchy.racks) {
      const rs = rackStats(rack);
      totalProducts += rs.totalQty;
      totalBoxes += rs.totalBoxes;
      activeBoxes += rs.activeBoxes;
    }
    return { totalProducts, totalRacks: hierarchy.racks.length, totalBoxes, activeBoxes };
  }, [hierarchy]);

  const handleBoxSelect = (box: HierarchyBox, initialLayout: BoxLayout) => {
    setSelectedBox(box);
    setSelectedLayout(initialLayout);
    setPanelOpen(true);
  };

  return (
    <>
      {showTitle && <h3 className="fx-section-title">{title ?? t('rackTitle')}</h3>}

      <div className="fx-scan-toolbar" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`fx-btn fx-btn-secondary${view === 'grid' ? ' active' : ''}`}
          id="btnGrid"
          onClick={() => setView('grid')}
        >
          <GridViewIcon fontSize="small" /> {t('pages:rackViewGrid')}
        </button>
        <button
          type="button"
          className={`fx-btn fx-btn-secondary${view === 'table' ? ' active' : ''}`}
          id="btnTable"
          onClick={() => setView('table')}
        >
          <TableRowsIcon fontSize="small" /> {t('pages:rackViewTable')}
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={<Inventory2Icon />}
          value={stats.totalProducts}
          label={t('pages:rackStatProducts')}
          iconClass="stat-icon--rack-qty"
        />
        <StatCard
          icon={<ViewModuleIcon />}
          value={stats.totalBoxes}
          label={t('pages:rackStatBoxes')}
          iconClass="stat-icon--rack-boxes"
        />
        <StatCard
          icon={<LayersIcon />}
          value={stats.totalRacks}
          label={t('pages:rackStatRacks')}
          iconClass="stat-icon--rack-racks"
        />
        <StatCard
          icon={<CheckCircleOutlineIcon />}
          value={stats.activeBoxes}
          label={t('pages:rackStatActive')}
          iconClass="stat-icon--rack-active"
        />
      </div>

      {error && (
        <div className="message warning" style={{ marginBottom: '1rem' }}>
          {error}
          <button type="button" style={{ marginLeft: 8 }} onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <CircularProgress size={36} />
          <p style={{ marginTop: 12 }}>{t('common:loading')}</p>
        </div>
      ) : !hierarchy?.racks.length ? (
        <p style={{ color: '#64748b' }}>{t('common:noData')}</p>
      ) : view === 'grid' ? (
        <GridView hierarchy={hierarchy} onBoxSelect={handleBoxSelect} />
      ) : (
        <TableView hierarchy={hierarchy} onBoxSelect={handleBoxSelect} />
      )}

      <BoxLayoutPanel
        open={panelOpen}
        boxId={selectedBox?.id ?? null}
        boxCode={selectedBox?.boxCode}
        initialLayout={selectedLayout}
        highlightBoxId={highlightBoxId}
        highlightSlotId={highlightSlotId}
        onClose={() => {
          setPanelOpen(false);
          setSelectedBox(null);
          setSelectedLayout(null);
        }}
      />
    </>
  );
}
