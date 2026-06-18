/**
 * Push location highlight to TV, 3D (via tv_highlight.json), and IO outputs.
 */
(function () {
    'use strict';

    var highlightInFlight = false;

    function gatewayUrl() {
        if (typeof window.WH_HIGHLIGHT_API === 'string' && window.WH_HIGHLIGHT_API) {
            return window.WH_HIGHLIGHT_API;
        }
        return 'api_gateway.php?call=highlight_location.php';
    }

    function tvSetUrl() {
        return 'api_tv_highlight.php?action=set';
    }

    function normalizePayload(data) {
        if (!data || typeof data !== 'object') {
            return null;
        }
        var boxId = parseInt(data.box_id, 10);
        if (!boxId) {
            return null;
        }
        return {
            product_name: data.product_name || data.HanaPart || '',
            box_id: boxId,
            slot_id: parseInt(data.slot_id, 10) || 0,
            slot_no: data.slot_no != null ? data.slot_no : (data.Loc_Slot || ''),
            box_code: data.box_code || data.Loc_Box || '',
            level_no: data.level_no != null ? data.level_no : (data.Loc_Level || ''),
            rack_name: data.rack_name || data.Loc_Shelf || '',
            qty: data.qty != null ? data.qty : (data.QtyRemain != null ? data.QtyRemain : 0),
            action_type: data.action_type || 'highlight',
            puid: data.PUID || data.puid || '',
            material_code: data.material_code || data.HanaPart || '',
            trigger_io: data.trigger_io !== false
        };
    }

    function pushTvFile(payload) {
        return fetch(tvSetUrl(), {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (r) { return r.json(); })
            .catch(function (err) {
                console.warn('pushTvFile failed', err);
                return { status: 'error', message: err.message || 'TV set failed' };
            });
    }

    function pushIoHighlight(payload) {
        return fetch(gatewayUrl(), {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (r) { return r.json(); })
            .catch(function (err) {
                console.warn('pushIoHighlight failed', err);
                return { status: 'error', message: err.message || 'IO highlight failed' };
            });
    }

    window.pushWarehouseHighlight = function (data) {
        if (highlightInFlight) {
            return Promise.resolve({ status: 'busy', message: 'Highlight already in progress' });
        }

        var payload = normalizePayload(data);
        if (!payload && data && (data.puid || data.material_code)) {
            payload = {
                puid: data.puid || data.PUID || '',
                material_code: data.material_code || data.HanaPart || '',
                action_type: data.action_type || 'highlight',
                trigger_io: data.trigger_io !== false
            };
        }
        if (!payload) {
            return Promise.resolve({ status: 'warning', message: 'No box_id for highlight' });
        }

        highlightInFlight = true;

        // Phase 1: TV + 3D file immediately (poll picks up within ~500ms)
        var tvPromise = payload.box_id
            ? pushTvFile(payload)
            : Promise.resolve({ status: 'skipped', message: 'No box_id for TV file' });

        // Phase 2: IO lights (server defers Raspi HTTP after response)
        var ioPayload = Object.assign({}, payload, { trigger_io: true });
        pushIoHighlight(ioPayload).catch(function () {});

        return tvPromise.finally(function () {
            highlightInFlight = false;
        });
    };

    window.isWarehouseHighlightBusy = function () {
        return highlightInFlight;
    };

    window.highlightFromInventoryData = function (data, actionType) {
        if (!data) {
            return Promise.resolve({ status: 'warning', message: 'No data' });
        }
        return pushWarehouseHighlight(Object.assign({}, data, {
            action_type: actionType || data.action_type || 'highlight'
        }));
    };
})();
