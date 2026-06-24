import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CHUNK_RETRY_KEY = 'vl-chunk-reload';

type LazyModule<T extends ComponentType<unknown>> = { default: T };

/**
 * lazy() wrapper — retries once on chunk load failure (common after deploy when
 * the browser still has a stale index.html). Reloads the page once per session.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<LazyModule<T>>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const retried = sessionStorage.getItem(CHUNK_RETRY_KEY);
      if (!retried) {
        sessionStorage.setItem(CHUNK_RETRY_KEY, '1');
        window.location.reload();
        return new Promise(() => {
          /* reload in progress */
        });
      }
      sessionStorage.removeItem(CHUNK_RETRY_KEY);
      throw error;
    }
  });
}

/** Clear retry flag after a successful app boot. */
export function clearChunkRetryFlag(): void {
  sessionStorage.removeItem(CHUNK_RETRY_KEY);
}
