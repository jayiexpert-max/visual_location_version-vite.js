import { useAuthStore } from '../store/authStore';

/** Login URL for current device context (handheld vs desktop). */
export function loginPathForSession(timeout = true): string {
  if (typeof window === 'undefined') return '/login';
  const { deviceType } = useAuthStore.getState();
  const handheld =
    deviceType === 'handheld' || window.location.pathname.startsWith('/handheld');
  const base = handheld ? '/handheld/login' : '/login';
  return timeout ? `${base}?timeout=1` : base;
}

export function redirectToLogin(timeout = true): void {
  if (typeof window === 'undefined') return;
  const target = loginPathForSession(timeout);
  const loginBase = target.split('?')[0];
  if (!window.location.pathname.startsWith(loginBase)) {
    window.location.assign(target);
  }
}
