/**
 * Prevent double-clicks on fetch / save / highlight actions.
 */
(function () {
    'use strict';

    var flights = {};

    function resolveEl(ref) {
        if (!ref) return null;
        return typeof ref === 'string' ? document.getElementById(ref) : ref;
    }

    function rememberIdle(btn) {
        if (btn && btn.dataset.fbIdle === undefined) {
            btn.dataset.fbIdle = btn.innerHTML;
        }
    }

    window.FormBusy = {
        isBusy: function (key) {
            return !!flights[key || '__global__'];
        },

        tryBegin: function (key) {
            var k = key || '__global__';
            if (flights[k]) return false;
            flights[k] = true;
            return true;
        },

        end: function (key) {
            flights[key || '__global__'] = false;
        },

        setButtons: function (busy, buttons) {
            (buttons || []).forEach(function (cfg) {
                var btn = resolveEl(cfg.id || cfg.el);
                if (!btn) return;
                rememberIdle(btn);
                btn.disabled = !!busy;
                if (busy && cfg.busyHtml) {
                    btn.innerHTML = cfg.busyHtml;
                } else if (!busy && btn.dataset.fbIdle !== undefined) {
                    btn.innerHTML = btn.dataset.fbIdle;
                }
            });
        },

        setInputs: function (busy, ids) {
            (ids || []).forEach(function (id) {
                var input = resolveEl(id);
                if (input) input.disabled = !!busy;
            });
        },

        guardSubmit: function (formId, opts) {
            var form = resolveEl(formId);
            if (!form) return;
            var submitId = opts && opts.submitId;
            var key = 'submit:' + formId;

            form.addEventListener('submit', function (e) {
                if (window._isFetchingAPI || FormBusy.isBusy(key)) {
                    e.preventDefault();
                    return;
                }
                if (!form.checkValidity()) return;
                if (!FormBusy.tryBegin(key)) {
                    e.preventDefault();
                    return;
                }
                window._isSubmitting = true;
                var buttons = [];
                if (submitId) {
                    buttons.push({
                        id: submitId,
                        busyHtml: (opts && opts.busyHtml) || '<i class="fas fa-spinner fa-spin"></i>'
                    });
                }
                if (opts && opts.alsoDisable) {
                    opts.alsoDisable.forEach(function (id) {
                        buttons.push({ id: id });
                    });
                }
                FormBusy.setButtons(true, buttons);
                // Do not disable named inputs here — disabled fields are excluded from POST.
            });
        }
    };
})();
