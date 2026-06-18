import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function getLastCutoffMs(now: Date, morning: string, evening: string): number {
  const [mH, mM] = morning.split(':').map(Number);
  const [eH, eM] = evening.split(':').map(Number);

  const morningCut = new Date(now);
  morningCut.setHours(mH, mM, 0, 0);

  const eveningCut = new Date(now);
  eveningCut.setHours(eH, eM, 0, 0);

  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;
  const morningMinutes = mH * 60 + mM;
  const eveningMinutes = eH * 60 + eM;

  if (currentMinutes >= eveningMinutes) {
    return eveningCut.getTime();
  }
  if (currentMinutes >= morningMinutes) {
    return morningCut.getTime();
  }

  const yesterdayEvening = new Date(eveningCut);
  yesterdayEvening.setDate(yesterdayEvening.getDate() - 1);
  return yesterdayEvening.getTime();
}

export function useShiftLogout(enabled = true) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    const check = () => {
      const now = new Date();
      const cutoff = getLastCutoffMs(now, '07:00', '19:00');
      const loginAt = Number(sessionStorage.getItem('vl-login-at') ?? '0');
      if (loginAt > 0 && loginAt < cutoff) {
        void logout().finally(() => {
          navigate('/login?shift=1', { replace: true });
        });
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [enabled, logout, navigate]);
}
