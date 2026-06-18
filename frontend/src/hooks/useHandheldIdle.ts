import { useEffect } from 'react';

const HANDHELD_IDLE_MS = 30 * 60 * 1000;

/** Log out after 30 minutes of inactivity (Keyence BT-A500). */
export function useHandheldIdle(onIdle: () => void) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(onIdle, HANDHELD_IDLE_MS);
    };

    const events = ['click', 'keydown', 'input', 'touchstart', 'pointerdown'] as const;
    events.forEach((name) => window.addEventListener(name, reset, { passive: true }));
    reset();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, reset));
    };
  }, [onIdle]);
}
