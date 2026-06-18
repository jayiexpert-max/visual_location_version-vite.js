/** Append TV kiosk key for public display routes (/tv, /layout-3d). */
export function buildKioskUrl(path: string, extra?: Record<string, string>): string {
  const key = import.meta.env.VITE_TV_KIOSK_KEY?.trim();
  const params = new URLSearchParams();
  if (key) params.set('tv_key', key);
  if (extra) {
    for (const [name, value] of Object.entries(extra)) {
      if (value) params.set(name, value);
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
