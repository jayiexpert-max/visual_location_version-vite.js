import { useCallback, useEffect, useRef } from 'react';

export function isHighlightExpired(expiresAt: string | undefined | null): boolean {
  if (!expiresAt) return false;
  const expiresMs = new Date(expiresAt).getTime();
  return Number.isNaN(expiresMs) || expiresMs <= Date.now();
}

/** Schedules a one-shot callback when a TV highlight expires (client clock). */
export function useHighlightExpiryTimer() {
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(
    (expiresAt: string | undefined | null, onExpire: () => void) => {
      clearTimer();
      if (!expiresAt) return;

      const expiresMs = new Date(expiresAt).getTime();
      if (Number.isNaN(expiresMs)) return;

      const delay = Math.max(0, expiresMs - Date.now());
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        onExpire();
      }, delay);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { schedule, clearTimer };
}
