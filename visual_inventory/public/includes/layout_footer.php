<footer class="fx-footer">
    &copy; <?= date('Y') ?> <?= htmlspecialchars(__('system_name')) ?>
</footer>
<button type="button" class="fx-back-to-top" id="fxBackToTop"
    aria-label="<?= htmlspecialchars(__('back_to_top')) ?>"
    title="<?= htmlspecialchars(__('back_to_top')) ?>">
    <i class="fas fa-arrow-up" aria-hidden="true"></i>
</button>
<script>
(function () {
    function initBackToTop() {
        var btn = document.getElementById('fxBackToTop');
        if (!btn || !document.body.classList.contains('factory-app')) return;

        var threshold = 280;
        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function toggle() {
            btn.classList.toggle('is-visible', window.scrollY > threshold);
        }

        window.addEventListener('scroll', toggle, { passive: true });
        toggle();

        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackToTop);
    } else {
        initBackToTop();
    }
})();
</script>
