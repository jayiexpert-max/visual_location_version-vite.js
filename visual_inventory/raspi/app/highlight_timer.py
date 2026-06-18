from __future__ import annotations

import logging
import threading
from typing import Callable

logger = logging.getLogger(__name__)


class HighlightTimer:
    """Single auto-off timer — new highlight cancels the previous schedule."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._timer: threading.Timer | None = None

    def cancel(self) -> None:
        with self._lock:
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None
                logger.debug('Auto-off timer cancelled')

    def schedule(self, duration_sec: int, callback: Callable[[], None]) -> None:
        if duration_sec <= 0:
            return

        with self._lock:
            if self._timer is not None:
                self._timer.cancel()

            def _run() -> None:
                try:
                    callback()
                except Exception:
                    logger.exception('Auto-off callback failed')
                finally:
                    with self._lock:
                        self._timer = None

            self._timer = threading.Timer(duration_sec, _run)
            self._timer.daemon = True
            self._timer.start()
            logger.info('Auto-off scheduled in %s seconds', duration_sec)
