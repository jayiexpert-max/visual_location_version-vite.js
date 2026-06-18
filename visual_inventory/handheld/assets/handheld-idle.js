(function () {
    const HANDHELD_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
    let idleTimer = null;

    function resetIdleTimer() {
        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(function () {
            window.location.href = 'logout?timeout=1&reason=idle';
        }, HANDHELD_IDLE_TIMEOUT_MS);
    }

    ['click', 'keydown', 'input', 'touchstart', 'pointerdown', 'scan'].forEach(function (eventName) {
        window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });
    resetIdleTimer();
})();
