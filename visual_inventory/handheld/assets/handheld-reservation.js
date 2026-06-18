(function () {
    var apiBase = (document.body.dataset.apiBase || '../public').replace(/\/$/, '');
    var operator = (document.body.dataset.username || '').trim();

    var messageEl = document.getElementById('dynamicMessage');
    var form = document.getElementById('reservationReceiveForm');
    if (!form) return;

    var reservationInput = document.getElementById('reservation_input');
    var puidInput = document.getElementById('puid_input');
    var detailView = document.getElementById('reservationDetailView');
    var linesEl = document.getElementById('reservationLines');
    var summaryEl = document.getElementById('stockSummary');
    var btnCheckPuid = document.getElementById('btnCheckPuid');
    var btnConfirm = document.getElementById('btnConfirmReceive');

    var currentReservation = null;
    var reservationMatch = null;

    function apiUrl(path) {
        return apiBase + '/' + String(path || '').replace(/^\//, '');
    }

    function showMessage(type, html) {
        if (!messageEl) return;
        messageEl.hidden = false;
        messageEl.className = 'fx-alert ' + (type === 'success' ? 'fx-alert-success' : 'fx-alert-warning');
        messageEl.innerHTML = html;
    }

    function hideMessage() {
        if (messageEl) messageEl.hidden = true;
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value || '-';
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    function escapeAttr(str) {
        return escapeHtml(str).replace(/"/g, '&quot;');
    }

    function normalizeResNo(value) {
        return String(value || '').trim().toUpperCase().replace(/^RES/i, '');
    }

    function cleanPuid(value) {
        return String(value || '').trim().toUpperCase().replace(/^VL/, '');
    }

    function locationText(data) {
        var parts = [
            data.Loc_Shelf ? 'Rack ' + data.Loc_Shelf : '',
            data.Loc_Level ? 'L' + data.Loc_Level : '',
            data.Loc_Box ? 'Box ' + data.Loc_Box : '',
            data.Loc_Slot ? 'Slot ' + data.Loc_Slot : ''
        ].filter(Boolean);
        return parts.join(' / ') || 'N/A';
    }

    function isCpkReceivedFlag(value) {
        var v = String(value || '').toUpperCase().trim();
        return ['Y', 'YES', 'TRUE', '1', 'R', 'RECEIVED', 'DONE'].indexOf(v) >= 0;
    }

    function isPuidLocallyReceived(p) {
        return !!(p && p.is_already_in_db);
    }

    function isPuidCpkReceived(p) {
        return !!(p && (p.cpk_received || isCpkReceivedFlag(p.Received)));
    }

    function isPuidReceived(p) {
        return isPuidLocallyReceived(p) || isPuidCpkReceived(p) || !!(p && p.is_received);
    }

    function puidStatusLabel(p) {
        if (isPuidLocallyReceived(p)) return 'Received';
        if (isPuidCpkReceived(p)) return 'CPK received';
        return 'Pending';
    }

    function puidStatusClass(p) {
        if (isPuidLocallyReceived(p)) return 'fx-badge-ok';
        if (isPuidCpkReceived(p)) return 'fx-badge-partial';
        return 'fx-badge-open';
    }

    function fetchJson(url) {
        return fetch(url, { credentials: 'same-origin' }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        });
    }

    function postJson(url, payload) {
        return fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        });
    }

    function reservationCompleted(items) {
        if (!items || !items.length) return false;
        return items.every(function (item) {
            var puids = item.PUIDList || [];
            if (!puids.length) return false;
            return puids.every(isPuidReceived);
        });
    }

    function renderReservationLines(items) {
        if (!linesEl) return;
        var rows = [];
        (items || []).forEach(function (item) {
            var puids = item.PUIDList || [];
            if (!puids.length) {
                rows.push(
                    '<article class="hh-picklist-line" data-part="' + escapeAttr(item.PartNumber || '') + '">' +
                    '<div class="hh-picklist-line-head"><strong>' + escapeHtml(item.PartNumber || '—') + '</strong>' +
                    '<span class="fx-badge fx-badge-open">Awaiting PUID</span></div>' +
                    '<div class="hh-picklist-line-meta"><span>Item: ' + escapeHtml(item.ItemNo || '—') + '</span>' +
                    '<span>Request: ' + escapeHtml(item.RequestQty ?? '—') + '</span></div></article>'
                );
                return;
            }
            puids.forEach(function (p) {
                rows.push(
                    '<article class="hh-picklist-line' + (isPuidReceived(p) ? ' is-issued' : '') + '"' +
                    ' data-part="' + escapeAttr(item.PartNumber || '') + '"' +
                    ' data-puid="' + escapeAttr(cleanPuid(p.PUID)) + '">' +
                    '<div class="hh-picklist-line-head"><strong>' + escapeHtml(item.PartNumber || '—') + '</strong>' +
                    '<span class="fx-badge ' + puidStatusClass(p) + '">' + escapeHtml(puidStatusLabel(p)) + '</span></div>' +
                    '<div class="hh-picklist-line-meta">' +
                    '<span>PUID: ' + escapeHtml(p.PUID || '—') + '</span>' +
                    '<span>Qty: ' + escapeHtml(p.QtyRemain != null ? p.QtyRemain : (item.RequestQty ?? '—')) + '</span>' +
                    '<span>Batch: ' + escapeHtml(p.BatchNumber || '—') + '</span></div></article>'
                );
            });
        });
        linesEl.innerHTML = rows.length
            ? rows.join('')
            : '<p class="hh-picklist-empty">No items from CPK.</p>';

        if (typeof HandheldHighlight !== 'undefined' && HandheldHighlight.bindMaterialLines) {
            HandheldHighlight.bindMaterialLines(linesEl, {
                actionType: 'receive_reservation',
                onStatus: showMessage
            });
        }
    }

    function updateReservationHeader(data, meta) {
        var items = data.Items || [];
        var resNo = data.ReservationNo || normalizeResNo(reservationInput.value);
        var totalPuids = items.reduce(function (sum, item) {
            return sum + ((item.PUIDList && item.PUIDList.length) || 0);
        }, 0);
        var completed = reservationCompleted(items);

        document.getElementById('reservationHeading').textContent =
            'RES ' + resNo + (completed ? ' — Completed' : '');
        document.getElementById('reservationMeta').textContent =
            (meta && meta.item_count ? meta.item_count : items.length) + ' part line(s), ' +
            (meta && meta.puid_count ? meta.puid_count : totalPuids) + ' PUID(s) from CPK GET_RESNoInfo.';
    }

    function setPuidControls(enabled) {
        if (puidInput) puidInput.disabled = !enabled;
        if (btnCheckPuid) btnCheckPuid.disabled = !enabled;
        if (!enabled && btnConfirm) btnConfirm.disabled = true;
    }

    function clearMatch() {
        reservationMatch = null;
        if (summaryEl) summaryEl.hidden = true;
        if (btnConfirm) btnConfirm.disabled = true;
    }

    function showSummary(data, puidRow, meta) {
        setText('summaryReservation', currentReservation.ReservationNo);
        setText('summaryReservationStatus', reservationMatch ? 'PUID matched' : 'Loaded');
        setText('summaryPuid', puidRow.PUID);
        setText('summaryPart', data.HanaPart || reservationMatch.partNumber);
        setText('summaryIm', data.IM);
        setText('summaryQty', (data.QtyRemain != null ? data.QtyRemain : data.Qty || 0) + ' Pcs');
        setText('summaryLocation', locationText(data));
        if (summaryEl) summaryEl.hidden = false;
        if (btnConfirm) btnConfirm.disabled = false;
    }

    function findPuidInReservation(puid) {
        puid = cleanPuid(puid);
        var found = null;
        var targetItem = null;
        (currentReservation.Items || []).forEach(function (item) {
            (item.PUIDList || []).forEach(function (row) {
                if (cleanPuid(row.PUID) === puid) {
                    found = row;
                    targetItem = item;
                }
            });
        });
        return found ? { puidRow: found, item: targetItem } : null;
    }

    function markPuidReceivedInMemory(puid, localReceived) {
        if (!currentReservation || !puid) return;
        var target = cleanPuid(puid);
        (currentReservation.Items || []).forEach(function (item) {
            (item.PUIDList || []).forEach(function (p) {
                if (cleanPuid(p.PUID) !== target) return;
                p.cpk_received = true;
                p.Received = 'Y';
                p.is_received = true;
                if (localReceived) p.is_already_in_db = true;
            });
        });
        renderReservationLines(currentReservation.Items);
        updateReservationHeader(currentReservation, null);
    }

    async function loadReservation() {
        var resNo = normalizeResNo(reservationInput && reservationInput.value);
        if (!resNo) {
            showMessage('warning', 'Enter Reservation No.');
            reservationInput?.focus();
            return;
        }
        if (reservationInput) reservationInput.value = resNo;

        currentReservation = null;
        reservationMatch = null;
        setPuidControls(false);
        clearMatch();
        showMessage('warning', 'Loading reservation from CPK…');

        var detail = await fetchJson(
            apiUrl('api_gateway.php?call=get_res_info.php&res_no=' + encodeURIComponent(resNo))
        );

        if (detail.status !== 'success' || !detail.data || !Array.isArray(detail.data.Items)) {
            throw new Error(detail.message || 'Reservation not found in CPK.');
        }

        currentReservation = detail.data;
        detailView.hidden = false;
        updateReservationHeader(currentReservation, detail.meta);
        renderReservationLines(currentReservation.Items);
        setPuidControls(!reservationCompleted(currentReservation.Items));
        hideMessage();
        showMessage('success', 'Reservation loaded from CPK. Scan PUID to receive.');
        if (!reservationCompleted(currentReservation.Items)) {
            puidInput?.focus();
        }
    }

    async function verifyPuid() {
        var puid = cleanPuid(puidInput && puidInput.value);
        if (puidInput) puidInput.value = puid;
        if (!puid) return;

        reservationMatch = null;
        clearMatch();

        if (!currentReservation) {
            throw new Error('Load Reservation No. first.');
        }

        var match = findPuidInReservation(puid);
        if (!match) {
            setText('summaryReservationStatus', 'PUID not match');
            throw new Error('PUID does not match this reservation.');
        }

        var puidRow = match.puidRow;
        var targetItem = match.item;

        if (isPuidLocallyReceived(puidRow)) {
            throw new Error('This PUID is already received in warehouse.');
        }

        showMessage('warning', 'Checking PUID and loading material data…');

        var meta = await fetchJson(
            apiUrl('get_inventory_proxy.php?puid=' + encodeURIComponent(puidRow.PUID) +
                '&hanapart=' + encodeURIComponent(targetItem.PartNumber) + '&source=api')
        );

        if (meta.status !== 'success' || !meta.data) {
            throw new Error(meta.message || 'Cannot load material data. Check LAN, PDService, or CPK.');
        }

        if (!meta.data.slot_id) {
            throw new Error('Storage location not found. Assign location before receive.');
        }

        var skipCpk = isPuidCpkReceived(puidRow);
        reservationMatch = {
            reservationNo: currentReservation.ReservationNo,
            puid: puidRow.PUID,
            partNumber: targetItem.PartNumber,
            meta: meta.data,
            skip_cpk: skipCpk,
            cpkRow: puidRow
        };

        showSummary(meta.data, puidRow, meta);

        var note = '';
        if (meta.pdservice_warning) {
            note = '<br><small>' + escapeHtml(meta.pdservice_warning) + '</small>';
        } else if (meta.data_source === 'cpk') {
            note = '<br><small>Material data from CPK station inventory.</small>';
        }
        if (skipCpk) {
            note += '<br><small>CPK already received this PUID — confirm to sync local warehouse.</small>';
        }

        showMessage('success', 'PUID matches reservation. Confirm to receive.' + note);
        btnConfirm?.focus();
    }

    async function submitReceive(event) {
        event.preventDefault();

        if (!reservationMatch) {
            try {
                await verifyPuid();
            } catch (err) {
                showMessage('warning', err.message);
                puidInput?.focus();
                return;
            }
            if (!reservationMatch) return;
        }

        if (btnConfirm) btnConfirm.disabled = true;
        showMessage('warning', 'Receiving via CPK RES_PUIDRecv…');

        var meta = reservationMatch.meta;
        var locationParts = [
            meta.Loc_Shelf ? 'Rack ' + meta.Loc_Shelf : '',
            meta.Loc_Level ? 'L' + meta.Loc_Level : '',
            meta.Loc_Box ? 'Box ' + meta.Loc_Box : '',
            meta.Loc_Slot ? 'Slot ' + meta.Loc_Slot : ''
        ].filter(Boolean);

        var payload = Object.assign({}, meta, {
            call: 'receive_item.php',
            ReservationNo: reservationMatch.reservationNo,
            RES_NO: reservationMatch.reservationNo,
            PUID: reservationMatch.puid,
            Operator: operator,
            Location: locationParts.join(' '),
            skip_cpk: !!reservationMatch.skip_cpk
        });

        try {
            var result = await postJson(apiUrl('api_gateway.php'), payload);
            if (result.status !== 'success') {
                throw new Error(result.message || 'Receive failed.');
            }

            var successHtml = 'Reservation receive completed.';
            if (result.cpk_warnings && result.cpk_warnings.length) {
                successHtml += '<br><strong>CPK notes:</strong><br>' + result.cpk_warnings.map(function (w) {
                    return escapeHtml((w.Code || 'WARN') + ': ' + (w.Message || w));
                }).join('<br>');
            }
            if (result.cpk_sync_failed) {
                successHtml += '<br><small>Local save OK — CPK sync pending when network recovers.</small>';
            }

            showMessage('success', successHtml);
            markPuidReceivedInMemory(reservationMatch.puid, true);

            await postJson(apiUrl('api_gateway.php'), Object.assign({ call: 'highlight_location.php' }, meta))
                .catch(function () {});

            if (puidInput) puidInput.value = '';
            reservationMatch = null;
            clearMatch();

            try {
                await loadReservation();
            } catch (err) {
                showMessage('success', successHtml + '<br><small>Refresh RES failed: ' + escapeHtml(err.message) + '</small>');
            }

            if (puidInput && !puidInput.disabled) puidInput.focus();
        } catch (err) {
            showMessage('warning', err.message || 'Receive failed.');
        } finally {
            if (btnConfirm) btnConfirm.disabled = !reservationMatch;
        }
    }

    async function checkHandheldHealth() {
        try {
            var health = await fetchJson(apiUrl('handheld_health.php'));
            if (health.status !== 'success') {
                showMessage('warning', health.message || 'CPK / PDService unreachable — check factory LAN.');
                return;
            }
            if (health.pdservice !== 'connected' && health.cpk === 'connected') {
                showMessage('warning', health.message || 'PDService offline — CPK available for reservation lookup.');
            } else if (health.cpk === 'connected') {
                hideMessage();
            }
        } catch (err) {
            showMessage('warning', 'Cannot verify CPK connection. Check LAN before scanning.');
        }
    }

    var scanDebounceTimers = new Map();
    var SCAN_DEBOUNCE_MS = 200;
    var SCAN_MIN_LEN = 4;

    function stripScanValue(input) {
        var value = (input.value || '').replace(/[\r\n]+/g, '').trim();
        if (input === reservationInput) value = normalizeResNo(value);
        if (input === puidInput) value = cleanPuid(value);
        input.value = value;
        return value;
    }

    function runScanAction(input) {
        if (!input || input.disabled) return;

        if (input === reservationInput) {
            loadReservation().catch(function (err) {
                showMessage('warning', err.message);
                reservationInput.focus();
            });
            return;
        }

        if (input === puidInput) {
            stripScanValue(puidInput);
            if (!puidInput.value) return;
            verifyPuid().catch(function (err) {
                showMessage('warning', err.message);
                puidInput.focus();
            });
        }
    }

    function handleScanInput(input) {
        var raw = input.value || '';
        var hadSuffix = /[\r\n]/.test(raw);
        stripScanValue(input);

        if (hadSuffix && input.value) {
            window.clearTimeout(scanDebounceTimers.get(input));
            runScanAction(input);
            return;
        }

        window.clearTimeout(scanDebounceTimers.get(input));
        if (!input.classList.contains('scan-field')) return;

        scanDebounceTimers.set(input, window.setTimeout(function () {
            if (input.disabled) return;
            stripScanValue(input);
            var minLen = input === reservationInput ? 3 : SCAN_MIN_LEN;
            if (input.value.length >= minLen) runScanAction(input);
        }, SCAN_DEBOUNCE_MS));
    }

    document.getElementById('btnLoadReservation')?.addEventListener('click', function () {
        loadReservation().catch(function (err) {
            showMessage('warning', err.message);
            reservationInput?.focus();
        });
    });
    document.getElementById('btnRefreshReservation')?.addEventListener('click', function () {
        loadReservation().catch(function (err) {
            showMessage('warning', err.message);
        });
    });
    btnCheckPuid?.addEventListener('click', function () {
        verifyPuid().catch(function (err) {
            showMessage('warning', err.message);
            puidInput?.focus();
        });
    });
    form.addEventListener('submit', submitReceive);

    document.querySelectorAll('.scan-field').forEach(function (input) {
        input.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            stripScanValue(input);
            runScanAction(input);
        });
        input.addEventListener('input', function () {
            handleScanInput(input);
        });
    });

    checkHandheldHealth();
})();
