import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ClearIcon from '@mui/icons-material/Clear';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import { Alert, CircularProgress } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import * as cpkService from '../../services/cpkService';
import { getErrorMessage } from '../../services/apiClient';
import '../../styles/booking-out-puid.css';

type Destination = 'STORE' | 'OTHER';

const SUCCESS_RESET_SEC = 5;

function normalizePuid(value: string): string {
  return value.trim().toUpperCase().replace(/^VL/i, '');
}

function previewTone(
  loading: boolean,
  error: string | null,
  eligible: boolean | undefined,
  hasPreview: boolean,
): 'idle' | 'loading' | 'error' | 'blocked' | 'ready' {
  if (loading) return 'loading';
  if (error) return 'error';
  if (hasPreview && eligible === false) return 'blocked';
  if (hasPreview) return 'ready';
  return 'idle';
}

export function BookingOutPage() {
  const { t, i18n } = useTranslation(['pages', 'common']);
  const isEn = i18n.language.startsWith('en');
  const { user } = useAuth();

  const inputRef = useRef<HTMLInputElement>(null);
  const [puid, setPuid] = useState('');
  const [destination, setDestination] = useState<Destination>('STORE');
  const [preview, setPreview] = useState<cpkService.BookingOutPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [successCountdown, setSuccessCountdown] = useState<number | null>(null);

  const eligibility = preview?.booking_eligibility?.[destination];
  const blockers = isEn
    ? eligibility?.blockers ?? []
    : eligibility?.blockers_th ?? eligibility?.blockers ?? [];
  const canSubmit = Boolean(preview && eligibility?.eligible && puid.trim());
  const tone = previewTone(previewLoading, previewError, eligibility?.eligible, Boolean(preview));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (successCountdown === null) return undefined;
    if (successCountdown <= 0) {
      setResult(null);
      setSuccessCountdown(null);
      inputRef.current?.focus();
      return undefined;
    }
    const timer = window.setTimeout(
      () => setSuccessCountdown((value) => (value !== null ? value - 1 : null)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [successCountdown]);

  const resetScan = useCallback(() => {
    setPuid('');
    setPreview(null);
    setPreviewError(null);
    setResult(null);
    setSuccessCountdown(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const loadPreview = useCallback(async () => {
    const normalized = normalizePuid(puid);
    setPuid(normalized);
    setResult(null);
    setSuccessCountdown(null);
    setPreview(null);
    setPreviewError(null);

    if (!normalized) {
      setPreviewError(t('pages:bookingPuidRequired'));
      return;
    }

    setPreviewLoading(true);
    try {
      const data = await cpkService.getBookingOutPreview(normalized);
      setPreview(data);
    } catch (err) {
      setPreviewError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setPreviewLoading(false);
    }
  }, [puid, t]);

  const submitMutation = useMutation({
    mutationFn: () =>
      cpkService.bookingOutPuid({
        puid: normalizePuid(puid),
        operator: user?.username ?? '',
        destination,
      }),
    onSuccess: () => {
      setConfirmOpen(false);
      setResult({ kind: 'success', message: t('pages:bookingOutSuccess') });
      setSuccessCountdown(SUCCESS_RESET_SEC);
      setPreview(null);
      setPuid('');
      setPreviewError(null);
    },
    onError: (err) => {
      setConfirmOpen(false);
      setResult({ kind: 'error', message: getErrorMessage(err, t('common:error'), t) });
    },
  });

  return (
    <>
      <div className="fx-booking-page">
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          {t('pages:bookingOutHint')}
        </Alert>

        <section className="fx-booking-card">
          <div className="fx-booking-card__head">
            <span className="fx-booking-step">1</span>
            <div>
              <h2 className="fx-booking-card__title">
                <QrCodeScannerIcon fontSize="small" />
                {t('pages:bookingScanPuid')}
              </h2>
              <p className="fx-booking-card__hint">{t('pages:bookingOutPanelHint')}</p>
            </div>
          </div>

          <label htmlFor="puidInput" className="fx-field-label">
            PUID
          </label>
          <div className="fx-scan-row fx-booking-scan-row">
            <input
              ref={inputRef}
              id="puidInput"
              type="text"
              className="fx-scan-input"
              value={puid}
              maxLength={64}
              autoComplete="off"
              placeholder={t('pages:bookingPuidPlaceholder')}
              onChange={(e) => setPuid(e.target.value.toUpperCase().replace(/^VL/i, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void loadPreview();
                }
              }}
            />
            <button
              type="button"
              className="fx-btn fx-btn-accent"
              disabled={previewLoading || !puid.trim()}
              onClick={() => void loadPreview()}
            >
              <SearchIcon fontSize="small" /> {t('common:load')}
            </button>
            <button
              type="button"
              className="fx-btn fx-btn-secondary"
              disabled={previewLoading && !puid.trim() && !preview && !previewError}
              onClick={resetScan}
              title={t('pages:bookingClear')}
              aria-label={t('pages:bookingClear')}
            >
              <ClearIcon fontSize="small" />
            </button>
          </div>
        </section>

        {(previewLoading || previewError || preview) && (
          <section className={`fx-booking-preview fx-booking-preview--${tone}`}>
            <h3 className="fx-booking-preview__title">{t('pages:bookingPreviewTitle')}</h3>

            {previewLoading && (
              <div className="fx-booking-preview__loading">
                <CircularProgress size={22} />
                <span>{t('pages:bookingPreviewLoading')}</span>
              </div>
            )}

            {previewError && !previewLoading && (
              <div className="fx-booking-preview__message">{previewError}</div>
            )}

            {preview && !previewLoading && (
              <>
                {!eligibility?.eligible && blockers.length > 0 && (
                  <div className="fx-booking-blockers">
                    <strong>{t('pages:bookingPrecheck')}</strong>
                    <ul>
                      {blockers.map((msg) => (
                        <li key={msg}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="fx-booking-hero">
                  <div>
                    <span className="fx-booking-hero__label">PUID</span>
                    <strong className="fx-booking-hero__puid">{preview.PUID}</strong>
                  </div>
                  <div>
                    <span className="fx-booking-hero__label">{t('common:partNumber')}</span>
                    <strong className="fx-booking-hero__part">{preview.HanaPart || '—'}</strong>
                  </div>
                  <div className="fx-booking-hero__qty">
                    <span className="fx-booking-hero__label">{t('pages:bookingQtyRemain')}</span>
                    <strong>{preview.QtyRemain ?? '—'}</strong>
                    <span className="fx-booking-hero__qty-sub">
                      / {preview.Qty ?? '—'} {t('pages:bookingFullQty')}
                    </span>
                  </div>
                </div>

                <dl className="fx-booking-preview-grid">
                  <dt>{t('common:description')}</dt>
                  <dd>{preview.Description || '—'}</dd>
                  <dt>IM</dt>
                  <dd>{preview.IM || '—'}</dd>
                  <dt>Lot</dt>
                  <dd>{preview.LotNo || '—'}</dd>
                  <dt>{t('common:expiryDate')}</dt>
                  <dd>{preview.ExpirationDate || '—'}</dd>
                  <dt>{t('common:status')}</dt>
                  <dd>{preview.StatusName || '—'}</dd>
                  <dt>{t('common:location')}</dt>
                  <dd>{preview.Location || '—'}</dd>
                  {preview.cpk_effective_remain != null && (
                    <>
                      <dt>{t('pages:bookingCpkRemain')}</dt>
                      <dd>{preview.cpk_effective_remain}</dd>
                    </>
                  )}
                </dl>
              </>
            )}
          </section>
        )}

        <section className="fx-booking-card">
          <div className="fx-booking-card__head">
            <span className="fx-booking-step">2</span>
            <div>
              <h2 className="fx-booking-card__title">
                <LocalShippingIcon fontSize="small" />
                {t('pages:bookingDestination')}
              </h2>
              <p className="fx-booking-card__hint">{t('pages:bookingSubmitHint')}</p>
            </div>
          </div>

          <div className="fx-booking-dest" role="radiogroup" aria-label={t('pages:bookingDestination')}>
            {(['STORE', 'OTHER'] as const).map((dest) => {
              const destEligible = preview?.booking_eligibility?.[dest]?.eligible;
              const selected = destination === dest;
              return (
                <button
                  key={dest}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`fx-booking-dest__btn${selected ? ' is-selected' : ''}${
                    preview && destEligible === false ? ' is-ineligible' : ''
                  }`}
                  onClick={() => setDestination(dest)}
                >
                  <span className="fx-booking-dest__icon">
                    {dest === 'STORE' ? (
                      <WarehouseIcon fontSize="small" />
                    ) : (
                      <LocalShippingIcon fontSize="small" />
                    )}
                  </span>
                  <span className="fx-booking-dest__label">{dest}</span>
                  {preview && destEligible === false && (
                    <small className="fx-booking-dest__warn">
                      {t('pages:bookingDestNotEligible')}
                    </small>
                  )}
                  {preview && destEligible === true && (
                    <small className="fx-booking-dest__ok">
                      {t('pages:bookingDestReady')}
                    </small>
                  )}
                </button>
              );
            })}
          </div>

          <p className="fx-booking-operator">
            {t('pages:bookingOperator')}: <strong>{user?.username ?? '—'}</strong>
          </p>

          <button
            type="button"
            className="fx-btn fx-btn-primary fx-btn-lg fx-booking-submit"
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {submitMutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <>
                <SendIcon fontSize="small" /> {t('pages:bookingOutSubmit')}
              </>
            )}
          </button>
        </section>

        {result && (
          <div className={`fx-booking-result is-${result.kind}`}>
            <div className="fx-booking-result-head">
              {result.kind === 'success' ? (
                <CheckCircleOutlineIcon className="fx-booking-result-icon--ok" />
              ) : (
                <ErrorOutlineIcon color="warning" />
              )}
              <span>{result.message}</span>
              {result.kind === 'success' && successCountdown !== null && (
                <small>
                  {t('pages:bookingNextScanIn', { seconds: successCountdown })}
                </small>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t('pages:bookingConfirmTitle')}
        message={t('pages:bookingConfirmMessage', {
          puid: normalizePuid(puid),
          destination,
          part: preview?.HanaPart ?? '—',
        })}
        confirmLabel={t('pages:bookingOutSubmit')}
        loading={submitMutation.isPending}
        onConfirm={() => submitMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
