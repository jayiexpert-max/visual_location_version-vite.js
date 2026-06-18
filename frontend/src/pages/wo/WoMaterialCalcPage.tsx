import CalculateIcon from '@mui/icons-material/Calculate';
import PlaceIcon from '@mui/icons-material/Place';
import SearchIcon from '@mui/icons-material/Search';
import { CircularProgress } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../services/apiClient';
import * as inventoryService from '../../services/inventoryService';
import * as woBomService from '../../services/woBomService';
import '../../styles/wo-material-calc.css';

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.abs(n - Math.round(n)) < 0.0001 ? String(Math.round(n)) : n.toFixed(2);
}

export function WoMaterialCalcPage() {
  const { t } = useTranslation(['pages', 'common']);

  const [woNo, setWoNo] = useState('');
  const [productionQty, setProductionQty] = useState(1);
  const [result, setResult] = useState<woBomService.WoBomPlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<string | null>(null);
  const [findMessage, setFindMessage] = useState<string | null>(null);

  const loadMutation = useMutation({
    mutationFn: () => woBomService.getWoBomPlan(woNo),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setActiveMaterial(null);
      setFindMessage(null);
    },
    onError: (err) => setError(getErrorMessage(err, t('common:error'), t)),
  });

  const prodQty = productionQty > 0 ? productionQty : 1;

  const summary = useMemo(() => {
    if (!result) return null;
    let shortCount = 0;
    for (const line of result.lines) {
      const totalNeed = line.requiredPerUnit * prodQty;
      if (line.usableStockQty < totalNeed) shortCount += 1;
    }
    return { shortCount, total: result.lines.length };
  }, [result, prodQty]);

  const handleFind = async (materialCode: string) => {
    setActiveMaterial(materialCode);
    setFindMessage(null);
    try {
      const response = await inventoryService.searchResolve(materialCode);
      if (response.status !== 'success' || !response.data) {
        throw new Error(response.message ?? t('common:error'));
      }
      const data = response.data;
      await inventoryService.highlightLocation({
        query: data.hanaPart || materialCode,
        slotId: data.slotId,
      });
      setFindMessage(
        t('pages:woHighlightLoc', {
          rack: data.rackName,
          level: data.levelNo,
          box: data.boxCode,
          slot: data.slotNo,
        }),
      );
    } catch (err) {
      setFindMessage(getErrorMessage(err, t('pages:woFindFailed'), t));
    }
  };

  return (
    <div className="fx-wo-page">
      <section className="fx-panel fx-wo-search-panel">
        <label htmlFor="woInput">{t('pages:woMaterialCalcTitle')}</label>
        <div className="fx-scan-row">
          <input
            id="woInput"
            type="text"
            className="fx-scan-input"
            value={woNo}
            placeholder={t('pages:woInputPlaceholder')}
            onChange={(e) => setWoNo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && woNo.trim()) loadMutation.mutate();
            }}
          />
          <button
            type="button"
            className="fx-btn fx-btn-accent"
            disabled={!woNo.trim() || loadMutation.isPending}
            onClick={() => loadMutation.mutate()}
          >
            {loadMutation.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <>
                <SearchIcon fontSize="small" /> {t('pages:woMaterialCalcLoad')}
              </>
            )}
          </button>
        </div>
      </section>

      {error && <div className="fx-alert fx-alert-warning">{error}</div>}

      {result && (
        <>
          <div className="wo-info-panel" style={{ display: 'grid' }}>
            <div className="wo-info-item">
              <label>{t('pages:woWorkOrder')}</label>
              <span>{result.info.workOrder}</span>
            </div>
            <div className="wo-info-item">
              <label>{t('pages:woAssemblyName')}</label>
              <span>{result.info.assemblyName}</span>
            </div>
            <div className="wo-info-item">
              <label>{t('pages:woRevision')}</label>
              <span>{result.info.assemblyRevision}</span>
            </div>
            <div className="wo-info-item">
              <label>{t('pages:woUpdatedAt')}</label>
              <span>{result.info.dataUpdatedTime}</span>
            </div>
            <div className="wo-info-item wo-prod-qty-wrap">
              <label htmlFor="productionQtyInput">{t('pages:woProductionQty')}</label>
              <input
                id="productionQtyInput"
                type="number"
                min={1}
                step={1}
                value={productionQty}
                onChange={(e) => setProductionQty(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div className="wo-info-item">
              <label>{t('pages:woStockSource')}</label>
              <span>{t('pages:woStockSourceWarehouse')}</span>
            </div>
          </div>

          <section className="fx-panel fx-wo-bom-panel">
            <h3 className="fx-section-title">
              <CalculateIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              {t('pages:woRequirementList')}
            </h3>

            {summary && (
              <div
                className={`wo-bom-summary${summary.shortCount ? ' wo-bom-summary--short' : ' wo-bom-summary--ok'}`}
              >
                {summary.shortCount
                  ? t('pages:woBomSummaryShort', {
                      short: summary.shortCount,
                      total: summary.total,
                    })
                  : t('pages:woBomSummaryOk', { total: summary.total })}
              </div>
            )}

            {findMessage && <div className="fx-alert fx-alert-info">{findMessage}</div>}

            <div className="wo-bom-table-wrap">
              <table className="fx-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="fx-center">Item</th>
                    <th className="fx-center">Op</th>
                    <th>{t('common:partNumber')}</th>
                    <th>{t('common:description')}</th>
                    <th className="fx-num">{t('pages:woReqPerUnit')}</th>
                    <th className="fx-num">{t('pages:woTotalNeed')}</th>
                    <th className="fx-num">{t('pages:woInSystem')}</th>
                    <th className="fx-num">{t('pages:woUsableStock')}</th>
                    <th className="fx-center">{t('common:expiryDate')}</th>
                    <th className="fx-num">{t('pages:woBalance')}</th>
                    <th className="fx-center">{t('common:status')}</th>
                    <th className="fx-center">{t('pages:woRolls')}</th>
                    <th className="fx-center">{t('common:actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((line, idx) => {
                    const totalNeed = line.requiredPerUnit * prodQty;
                    const balance = line.usableStockQty - totalNeed;
                    const short = balance < 0;
                    const rowClass = short
                      ? 'wo-bom-row--short'
                      : line.expiryStatus === 'expired'
                        ? 'wo-bom-row--expired'
                        : line.expiryStatus === 'near'
                          ? 'wo-bom-row--near-expiry'
                          : '';

                    return (
                      <tr key={`${line.materialCode}-${idx}`} className={rowClass}>
                        <td>{idx + 1}</td>
                        <td className="fx-center">{String(line.itemList ?? '—')}</td>
                        <td className="fx-center">{String(line.opCode ?? '—')}</td>
                        <td>
                          <span className="wo-bom-material">{line.materialCode}</span>
                        </td>
                        <td>{line.description}</td>
                        <td className="fx-num">{fmtNum(line.requiredPerUnit)}</td>
                        <td className="fx-num">{fmtNum(totalNeed)}</td>
                        <td className="fx-num">{fmtNum(line.systemStockQty)}</td>
                        <td className="fx-num">{fmtNum(line.usableStockQty)}</td>
                        <td className="fx-center">
                          {line.earliestExpiration ? (
                            <span
                              className={
                                line.expiryStatus === 'expired'
                                  ? 'wo-badge wo-badge--expired'
                                  : line.expiryStatus === 'near'
                                    ? 'wo-badge wo-badge--near'
                                    : 'wo-badge wo-badge--exp-ok'
                              }
                            >
                              {line.earliestExpiration}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={`fx-num ${short ? 'wo-num-bad' : 'wo-num-ok'}`}>
                          {fmtNum(balance)}
                        </td>
                        <td className="fx-center">
                          <span className={`wo-badge ${short ? 'wo-badge--short' : 'wo-badge--ok'}`}>
                            {short ? t('pages:woStockShort') : t('pages:woStockOk')}
                          </span>
                        </td>
                        <td className="fx-center">{line.puidCount}</td>
                        <td className="fx-center">
                          <button
                            type="button"
                            className={`btn-action${activeMaterial === line.materialCode ? ' active' : ''}`}
                            onClick={() => void handleFind(line.materialCode)}
                          >
                            <PlaceIcon fontSize="inherit" /> {t('pages:woFind')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
