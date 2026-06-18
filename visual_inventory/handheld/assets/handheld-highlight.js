(function () {
    'use strict';

    var highlightInFlight = false;

    function apiBase() {
        return (document.body.dataset.apiBase || '../public').replace(/\/$/, '');
    }

    function apiUrl(path) {
        return apiBase() + '/' + String(path || '').replace(/^\//, '');
    }

    function normalizeCode(raw) {
        return String(raw || '').trim().toUpperCase().replace(/^VL/, '');
    }

    function buildLocationSearchPayload(raw) {
        var code = normalizeCode(raw);
        var payload = { trigger_io: true };
        if (/^\d{10,}$/.test(code)) {
            payload.puid = code;
        } else {
            payload.material_code = code;
        }
        return payload;
    }

    function formatHighlightLocation(res) {
        var h = (res && res.highlight) ? res.highlight : {};
        var parts = [
            h.rack_name,
            h.level_no != null && h.level_no !== '' ? 'L' + h.level_no : '',
            h.box_code,
            h.slot_no != null && h.slot_no !== '' ? 'S' + h.slot_no : ''
        ].filter(function (p) { return p; });
        return parts.length ? parts.join(' / ') : '';
    }

    function searchMaterialHighlight(raw, actionType) {
        if (highlightInFlight) {
            return Promise.resolve({ status: 'busy', message: 'Highlight already in progress' });
        }

        var payload = buildLocationSearchPayload(raw);
        payload.action_type = actionType || 'picklist_search';
        highlightInFlight = true;

        return fetch(apiUrl('api_gateway.php'), {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ call: 'highlight_location.php' }, payload))
        })
            .then(function (r) { return r.json(); })
            .catch(function (err) {
                return { status: 'error', message: err.message || 'Highlight failed' };
            })
            .finally(function () {
                highlightInFlight = false;
            });
    }

    function formatSuccessMessage(raw, res) {
        var loc = formatHighlightLocation(res);
        var h = (res && res.highlight) ? res.highlight : {};
        var fifoHint = h.puid ? (' · FIFO PUID ' + h.puid) : '';
        var name = h.product_name || raw;
        return name + ' — shown on TV & 3D' + (loc ? ': ' + loc : '') + fifoHint;
    }

    function bindMaterialLines(container, options) {
        if (!container) {
            return;
        }

        var actionType = (options && options.actionType) || 'picklist_search';
        var onStatus = (options && options.onStatus) || function () {};

        container.querySelectorAll('.hh-picklist-line[data-part]').forEach(function (card) {
            if (card.getAttribute('data-hh-highlight-bound') === '1') {
                return;
            }
            card.setAttribute('data-hh-highlight-bound', '1');
            card.classList.add('is-clickable');

            card.addEventListener('click', function () {
                var raw = normalizeCode(card.getAttribute('data-part') || '');
                if (!raw) {
                    onStatus('warning', 'No part number on this line.');
                    return;
                }
                if (highlightInFlight) {
                    onStatus('warning', 'TV & 3D update in progress…');
                    return;
                }

                container.querySelectorAll('.hh-picklist-line.is-selected').forEach(function (line) {
                    line.classList.remove('is-selected');
                });
                card.classList.add('is-selected');
                onStatus('warning', 'Sending to TV & 3D… ' + raw);

                searchMaterialHighlight(raw, actionType).then(function (res) {
                    if (res && res.status === 'success') {
                        onStatus('success', formatSuccessMessage(raw, res));
                        return;
                    }
                    if (res && res.status === 'busy') {
                        onStatus('warning', 'TV & 3D update in progress…');
                        return;
                    }
                    onStatus('error', raw + ': ' + ((res && res.message) || 'Location not found in warehouse.'));
                });
            });
        });
    }

    window.HandheldHighlight = {
        search: searchMaterialHighlight,
        bindMaterialLines: bindMaterialLines,
        isBusy: function () { return highlightInFlight; },
        normalizeCode: normalizeCode,
        formatSuccess: formatSuccessMessage
    };
})();
