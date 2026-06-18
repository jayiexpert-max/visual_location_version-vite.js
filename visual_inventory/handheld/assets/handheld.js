(function () {
    const form = document.querySelector('.handheld-form');
    if (!form) return;

    const mode = form.dataset.mode;
    const message = document.getElementById('dynamicMessage');
    const workOrderInput = document.getElementById('workorder_input');
    const puidInput = document.getElementById('puid_input');
    const reservationInput = document.getElementById('reservation_input');
    const qtyInput = document.getElementById('qty_remain_input') || document.getElementById('qty_remain_display');
    const checkReservationButton = document.querySelector('[data-fetch-reservation]');
    const submitButton = form.querySelector('button[type="submit"]');
    const apiBase = (document.body.dataset.apiBase || '../public').replace(/\/$/, '');
    let reservationMatch = null;
    let currentReservation = null;
    let puidValidated = false;
    let loadedPuid = '';
    let addFetchInFlight = false;
    let withdrawFetchInFlight = false;
    let reservationFetchInFlight = false;
    let highlightInFlight = false;

    function apiUrl(path) {
        const clean = (path || '').replace(/^\//, '');
        return apiBase + '/' + clean;
    }

    function cleanPuid(value) {
        return (value || '').trim().toUpperCase().replace(/^VL/, '');
    }

    function normalizeWorkOrder(value) {
        return (value || '').trim();
    }

    function isWorkOrderReady() {
        return normalizeWorkOrder(workOrderInput && workOrderInput.value) !== '';
    }

    function setWithdrawStepEnabled(workOrderReady) {
        if (mode !== 'withdraw' || !puidInput) {
            return;
        }
        puidInput.disabled = !workOrderReady;
        if (!workOrderReady) {
            resetValidationState();
        }
    }

    function confirmWorkOrder() {
        if (!workOrderInput) {
            return true;
        }
        const workorder = normalizeWorkOrder(workOrderInput.value);
        workOrderInput.value = workorder;
        if (!workorder) {
            showMessage('warning', 'Please enter Work Order.');
            workOrderInput.focus();
            return false;
        }
        setWithdrawStepEnabled(true);
        setText('summaryWorkOrder', workorder);
        showMessage('success', 'Work Order OK. Scan PUID.');
        puidInput.focus();
        return true;
    }

    function showMessage(type, html) {
        if (!message) return;
        message.hidden = false;
        message.className = 'fx-alert ' + (type === 'success' ? 'fx-alert-success' : 'fx-alert-warning');
        message.innerHTML = html;
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '-';
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (!el) {
            return;
        }
        if (value === 0 || value === '0') {
            el.value = '0';
            return;
        }
        el.value = value ?? '';
    }

    function showSummary() {
        const summary = document.getElementById('stockSummary');
        if (summary) summary.hidden = false;
    }

    function setConfirmEnabled(enabled) {
        puidValidated = enabled;
        if (submitButton && (mode === 'add' || mode === 'withdraw')) {
            submitButton.disabled = !enabled;
        }
    }

    function setPanelVisible(id, visible) {
        const el = document.getElementById(id);
        if (el) {
            el.hidden = !visible;
        }
    }

    function setQtyRemainEnabled(enabled) {
        if (mode !== 'add' || !qtyInput) {
            return;
        }
        qtyInput.disabled = !enabled;
        qtyInput.readOnly = false;
        qtyInput.required = enabled;
        if (!enabled) {
            qtyInput.value = '';
            qtyInput.placeholder = 'สแกน PUID แล้วกด Get Data';
        } else {
            qtyInput.placeholder = 'จำนวนที่นับได้จริง';
        }
    }

    function clearAddMaterialFields() {
        ['hanapart_input', 'im_display', 'qty_display'].forEach(function (fieldId) {
            setValue(fieldId, '');
        });
        loadedPuid = '';
    }

    function resetValidationState() {
        setConfirmEnabled(false);
        puidValidated = false;
        loadedPuid = '';
        setPanelVisible('stockSummary', false);
        if (mode === 'add') {
            setQtyRemainEnabled(false);
            clearAddMaterialFields();
        }
    }

    function shouldResetForPuidChange(nextPuid) {
        if (!puidValidated || !loadedPuid) {
            return false;
        }
        return cleanPuid(nextPuid) !== loadedPuid;
    }

    function inventoryErrorMessage(err, json) {
        const raw = (json && json.message) || (err && err.message) || 'Request failed.';
        if (/pdservice|cpk|lan|timeout|unreachable|เชื่อมต่อ/i.test(raw)) {
            return raw;
        }
        return raw + '<br><small>If material data is missing, check LAN, PDService, or CPK.</small>';
    }

    function inventorySuccessNote(json) {
        if (!json) {
            return '';
        }
        if (json.pdservice_warning) {
            return '<br><small>' + json.pdservice_warning + '</small>';
        }
        if (json.data_source === 'cpk') {
            return '<br><small>Data from CPK station inventory.</small>';
        }
        return '';
    }

    function locationText(data) {
        const parts = [
            data.Loc_Shelf ? 'Rack ' + data.Loc_Shelf : '',
            data.Loc_Level ? 'L' + data.Loc_Level : '',
            data.Loc_Box ? 'Box ' + data.Loc_Box : '',
            data.Loc_Slot ? 'Slot ' + data.Loc_Slot : ''
        ].filter(Boolean);
        return parts.join(' / ') || 'N/A';
    }

    function fillCommon(data) {
        const remain = data.QtyRemain ?? data.Qty ?? 0;
        setValue('hanapart_input', data.HanaPart);
        setValue('im_display', data.IM);
        setValue('qty_display', data.Qty ?? 0);

        setText('summaryPart', data.HanaPart);
        setText('summaryIm', data.IM);
        setText('summaryFullQty', (data.Qty ?? 0) + ' Pcs');
        setText('summaryLocation', locationText(data));
        setPanelVisible('stockSummary', true);
    }

    function fillAdd(data) {
        fillCommon(data);
        const remain = data.QtyRemain ?? data.Qty ?? 0;
        setQtyRemainEnabled(true);
        setValue('qty_remain_input', remain);
        loadedPuid = cleanPuid(puidInput && puidInput.value);
        setValue('loc_shelf_input', data.Loc_Shelf);
        setValue('loc_level_input', data.Loc_Level);
        setValue('loc_box_input', data.Loc_Box);
        setValue('loc_slot_input', data.Loc_Slot);
        setValue('slot_id_input', data.slot_id);
        setValue('customer_input', data.Customer);
        setValue('description_input', data.Description);
        setValue('mnf_part_no_input', data.MnfPartNo);
        setValue('lot_no_input', data.LotNo);
        setValue('date_code_input', data.DateCode);
        setValue('bin_size_input', data.BinSize);
        setValue('status_name_input', data.StatusName || 'Available');
        setValue('mc_id_input', data.McID);
        setValue('machine_name_input', data.MachineName);
        setValue('expiration_date_input', data.ExpirationDate);
        setValue('old_im_input', data.OldIM);
        setValue('remark_input', data.Remark);
        setValue('expire_date_room_temp_input', data.ExpireDate_RoomTemp);
        setValue('reservation_no_input', data.ReservationNo);
    }

    async function fetchJson(url) {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) {
            throw new Error('HTTP ' + res.status);
        }
        return await res.json();
    }

    async function postJson(url, payload) {
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            throw new Error('HTTP ' + res.status);
        }
        return await res.json();
    }

    async function triggerHighlight(data, actionType) {
        if (highlightInFlight) {
            return { status: 'busy', message: 'Highlight already in progress' };
        }
        highlightInFlight = true;
        const payload = Object.assign({}, data, {
            action_type: actionType,
            QtyRemain: data.QtyRemain || data.Qty || 0
        });

        try {
            return await postJson(apiUrl('api_gateway.php'), Object.assign({ call: 'highlight_location.php' }, payload)).catch(function () {
                return postJson(apiUrl('api_gateway.php?call=trigger_tv_highlight.php'), payload).catch(function () {});
            });
        } finally {
            highlightInFlight = false;
        }
    }

    function setFetchButtonsDisabled(disabled) {
        document.querySelectorAll('[data-fetch-add], [data-fetch-withdraw], [data-fetch-reservation], [data-fetch-reservation-no]').forEach(function (btn) {
            btn.disabled = disabled;
        });
        if (submitButton && (mode === 'add' || mode === 'withdraw')) {
            if (disabled) {
                submitButton.disabled = true;
            } else if (!puidValidated) {
                submitButton.disabled = true;
            }
        }
    }

    async function fetchInventoryData() {
        const puid = cleanPuid(puidInput.value);
        puidInput.value = puid;
        if (!puid) return;

        showMessage('warning', 'Loading material data...');
        const query = '?puid=' + encodeURIComponent(puid) + '&source=api';
        let json;
        try {
            json = await fetchJson(apiUrl('get_inventory_proxy.php' + query));
        } catch (err) {
            throw new Error('Cannot load material data. Check LAN, PDService, or CPK.');
        }
        if (json.status !== 'success') {
            throw new Error(inventoryErrorMessage(null, json));
        }
        return json;
    }

    async function fetchAddData() {
        const puid = cleanPuid(puidInput && puidInput.value);
        if (!puid) {
            showMessage('warning', 'Scan PUID first.');
            puidInput?.focus();
            return;
        }
        if (addFetchInFlight) {
            return;
        }
        addFetchInFlight = true;
        setFetchButtonsDisabled(true);
        setConfirmEnabled(false);
        showMessage('warning', 'Loading material data...');
        try {
            const json = await fetchInventoryData();
            if (!json || !json.data) {
                throw new Error('No material data returned.');
            }
            const data = json.data;
            fillAdd(data);
            setConfirmEnabled(true);
            puidValidated = true;
            showMessage('success', 'Material found. Edit Qty Remain if needed, then tap Confirm Receive. TV / 3D / lights show after confirm.' + inventorySuccessNote(json));
            document.getElementById('qtyRemainSection')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            if (qtyInput) {
                qtyInput.focus();
                qtyInput.select();
            } else {
                submitButton?.focus();
            }
        } catch (err) {
            resetValidationState();
            showMessage('warning', typeof err.message === 'string' ? err.message : inventoryErrorMessage(err));
            puidInput?.focus();
        } finally {
            addFetchInFlight = false;
            setFetchButtonsDisabled(false);
        }
    }

    async function fetchWithdrawData() {
        if (withdrawFetchInFlight) {
            return;
        }
        if (!isWorkOrderReady()) {
            showMessage('warning', 'Enter Work Order first.');
            workOrderInput?.focus();
            return;
        }
        withdrawFetchInFlight = true;
        setFetchButtonsDisabled(true);
        resetValidationState();
        try {
            const json = await fetchInventoryData();
            const data = json.data;
            fillCommon(data);
            setText('summaryWorkOrder', normalizeWorkOrder(workOrderInput?.value));

            const puid = cleanPuid(puidInput.value);
            const query = '?action=search&puid=' + encodeURIComponent(puid);
            const invJson = await fetchJson(apiUrl('withdraw_product.php' + query));
            if (invJson.status !== 'success') {
                throw new Error(invJson.message || 'Stock is not available.');
            }

            const actualQty = invJson.data.QtyRemain || 0;
            setValue('qty_remain_display', actualQty);
            setText('summaryQty', actualQty + ' Pcs');
            setConfirmEnabled(true);
            showMessage('success', 'Stock validated. Tap Confirm to withdraw. TV / 3D / lights show after confirm.' + inventorySuccessNote(json));
            submitButton?.focus();
        } catch (err) {
            showMessage('warning', typeof err.message === 'string' ? err.message : inventoryErrorMessage(err));
            setValue('qty_remain_display', 0);
            puidInput.focus();
        } finally {
            withdrawFetchInFlight = false;
            setFetchButtonsDisabled(false);
        }
    }

    function setReservationControls(loaded) {
        if (!puidInput) return;

        puidInput.disabled = !loaded;
        if (checkReservationButton) checkReservationButton.disabled = !loaded;
    }

    async function loadReservation() {
        const resNo = (reservationInput?.value || '').trim();
        if (!resNo) return;
        if (reservationFetchInFlight) return;

        reservationFetchInFlight = true;
        setFetchButtonsDisabled(true);
        reservationMatch = null;
        currentReservation = null;
        setReservationControls(false);
        showMessage('warning', 'Loading reservation...');

        try {
            const detail = await fetchJson(apiUrl('api_gateway.php?call=get_res_info.php&res_no=' + encodeURIComponent(resNo)));

            if (detail.status !== 'success' || !detail.data || !Array.isArray(detail.data.Items)) {
                throw new Error(detail.message || 'Reservation not found.');
            }

            currentReservation = detail.data;
            setText('summaryReservation', currentReservation.ReservationNo);
            setText('summaryReservationStatus', 'Loaded');
            setText('summaryPuid', '-');
            setText('summaryPart', '-');
            setText('summaryIm', '-');
            setText('summaryQty', '0');
            setText('summaryLocation', '-');
            showSummary();
            setReservationControls(true);
            showMessage('success', 'Reservation loaded. Scan PUID to verify.');
            puidInput.focus();
        } finally {
            reservationFetchInFlight = false;
            setFetchButtonsDisabled(false);
        }
    }

    async function fetchReservationData() {
        const puid = cleanPuid(puidInput.value);
        puidInput.value = puid;
        if (!puid) return;
        if (reservationFetchInFlight) return;

        reservationFetchInFlight = true;
        setFetchButtonsDisabled(true);
        try {
        reservationMatch = null;
        if (!currentReservation) {
            throw new Error('Scan Reservation No. first.');
        }

        showMessage('warning', 'Checking PUID against reservation...');

        for (const item of currentReservation.Items) {
            const puidRow = (item.PUIDList || []).find(function (row) {
                return cleanPuid(row.PUID) === puid;
            });

            if (!puidRow) continue;

            if (puidRow.is_already_in_db) {
                throw new Error('This PUID is already received.');
            }

            const meta = await fetchJson(
                apiUrl('get_inventory_proxy.php?puid=' + encodeURIComponent(puidRow.PUID) +
                    '&hanapart=' + encodeURIComponent(item.PartNumber) + '&source=api')
            );

            if (meta.status !== 'success') {
                throw new Error(inventoryErrorMessage(null, meta));
            }

            reservationMatch = {
                reservationNo: currentReservation.ReservationNo,
                puid: puidRow.PUID,
                partNumber: item.PartNumber,
                meta: meta.data
            };

            setText('summaryReservation', currentReservation.ReservationNo);
            setText('summaryReservationStatus', 'PUID Matched');
            setText('summaryPuid', puidRow.PUID);
            fillCommon(meta.data);
            showMessage('success', 'PUID matches this reservation. Tap Confirm to receive. TV / 3D / lights show after confirm.');
            form.querySelector('button[type="submit"]')?.focus();
            return;
        }

        setText('summaryReservationStatus', 'PUID Not Match');
        throw new Error('PUID does not match this reservation.');
        } finally {
            reservationFetchInFlight = false;
            setFetchButtonsDisabled(false);
        }
    }

    async function submitReservationReceive(event) {
        event.preventDefault();

        if (!reservationMatch) {
            try {
                await fetchReservationData();
            } catch (err) {
                showMessage('warning', err.message);
                puidInput.focus();
                return;
            }
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        showMessage('warning', 'Receiving reservation item...');

        const meta = reservationMatch.meta;
        const locationParts = [
            meta.Loc_Shelf ? 'Rack ' + meta.Loc_Shelf : '',
            meta.Loc_Level ? 'L' + meta.Loc_Level : '',
            meta.Loc_Box ? 'Box ' + meta.Loc_Box : '',
            meta.Loc_Slot ? 'Slot ' + meta.Loc_Slot : ''
        ].filter(Boolean);

        const payload = Object.assign({}, meta, {
            call: 'receive_item.php',
            ReservationNo: reservationMatch.reservationNo,
            RES_NO: reservationMatch.reservationNo,
            PUID: reservationMatch.puid,
            Operator: (document.body.dataset.username || '').trim(),
            Location: locationParts.join(' ')
        });

        try {
            const result = await postJson(apiUrl('api_gateway.php'), payload);

            if (result.status !== 'success') {
                throw new Error(result.message || 'Receive failed.');
            }

            let successHtml = 'Reservation receive completed.';
            if (result.cpk_warnings && result.cpk_warnings.length) {
                const warnLines = result.cpk_warnings.map(function (w) {
                    return (w.Code || 'WARN') + ': ' + (w.Message || '');
                });
                successHtml += '<br><strong>CPK warnings:</strong><br>' + warnLines.join('<br>');
            }

            await postJson(apiUrl('api_gateway.php'), Object.assign({ call: 'highlight_location.php' }, reservationMatch.meta)).catch(function () {});

            showMessage('success', successHtml);
            puidInput.value = '';
            reservationMatch = null;
            puidInput.focus();
        } catch (err) {
            showMessage('warning', err.message);
        } finally {
            submitBtn.disabled = false;
        }
    }

    async function checkHandheldHealth() {
        if (!message || mode === 'reservation') {
            return;
        }

        try {
            const health = await fetchJson(apiUrl('handheld_health.php'));
            if (health.status !== 'success') {
                showMessage('warning', health.message || 'PDService and CPK unreachable — check LAN and factory network.');
                return;
            }
            if (health.pdservice !== 'connected' && health.cpk === 'connected') {
                showMessage('warning', health.message || 'PDService offline — CPK available for material lookup.');
            }
        } catch (err) {
            showMessage('warning', 'Cannot verify PDService/CPK. Check LAN connection before scanning.');
        }
    }

    if (mode === 'add' || mode === 'withdraw') {
        setConfirmEnabled(false);
        if (mode === 'add') {
            setQtyRemainEnabled(false);
        }
        if (mode === 'withdraw') {
            setWithdrawStepEnabled(false);
            workOrderInput?.addEventListener('input', function () {
                if (puidValidated) {
                    resetValidationState();
                }
                if (!isWorkOrderReady()) {
                    setWithdrawStepEnabled(false);
                }
            });
        }
        if (puidInput) {
            puidInput.addEventListener('input', function () {
                if (shouldResetForPuidChange(puidInput.value)) {
                    resetValidationState();
                }
            });
        }
        checkHandheldHealth();
    }

    document.querySelector('[data-fetch-add]')?.addEventListener('click', fetchAddData);
    document.querySelector('[data-fetch-withdraw]')?.addEventListener('click', fetchWithdrawData);
    document.querySelector('[data-fetch-reservation-no]')?.addEventListener('click', function () {
        loadReservation().catch(function (err) {
            showMessage('warning', err.message);
            reservationInput?.focus();
        });
    });
    document.querySelector('[data-fetch-reservation]')?.addEventListener('click', function () {
        fetchReservationData().catch(function (err) {
            showMessage('warning', err.message);
            puidInput.focus();
        });
    });
    if (mode === 'reservation') {
        form.addEventListener('submit', submitReservationReceive);
    }

    const scanDebounceTimers = new Map();
    const SCAN_DEBOUNCE_MS = 200;
    const SCAN_MIN_LEN = 4;

    function stripScanValue(input) {
        let value = (input.value || '').replace(/[\r\n]+/g, '').trim();
        if (input === puidInput) {
            value = cleanPuid(value);
        }
        input.value = value;
        return value;
    }

    function runScanAction(input) {
        if (!input || input.disabled) {
            return;
        }

        if (input === reservationInput) {
            loadReservation().catch(function (err) {
                showMessage('warning', err.message);
                reservationInput.focus();
            });
            return;
        }

        if (input === workOrderInput) {
            stripScanValue(workOrderInput);
            if (!workOrderInput.value) {
                return;
            }
            confirmWorkOrder();
            return;
        }

        if (input === puidInput) {
            if (mode === 'withdraw' && !isWorkOrderReady()) {
                showMessage('warning', 'Enter Work Order first.');
                workOrderInput?.focus();
                return;
            }
            stripScanValue(puidInput);
            if (!puidInput.value) {
                return;
            }
            if (mode === 'withdraw') {
                fetchWithdrawData();
            } else if (mode === 'reservation') {
                fetchReservationData().catch(function (err) {
                    showMessage('warning', err.message);
                    puidInput.focus();
                });
            } else {
                fetchAddData();
            }
            return;
        }

        if (input === qtyInput) {
            const inputs = [reservationInput, puidInput, qtyInput].filter(Boolean);
            const index = inputs.indexOf(input);
            const next = inputs[index + 1];
            if (next && !next.readOnly && !next.disabled) {
                next.focus();
                if (next.select) {
                    next.select();
                }
            } else if (puidValidated || mode === 'reservation') {
                form.requestSubmit();
            }
        }
    }

    function handleScanInput(input) {
        const raw = input.value || '';
        const hadSuffix = /[\r\n]/.test(raw);

        stripScanValue(input);

        if (hadSuffix && input.value) {
            window.clearTimeout(scanDebounceTimers.get(input));
            runScanAction(input);
            return;
        }

        window.clearTimeout(scanDebounceTimers.get(input));
        if (!input.classList.contains('scan-field')) {
            return;
        }

        scanDebounceTimers.set(input, window.setTimeout(function () {
            if (input.disabled) {
                return;
            }
            stripScanValue(input);
            if (input.value.length >= SCAN_MIN_LEN) {
                runScanAction(input);
            }
        }, SCAN_DEBOUNCE_MS));
    }

    document.querySelectorAll('.scan-field').forEach(function (input) {
        input.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') {
                return;
            }
            event.preventDefault();
            stripScanValue(input);
            runScanAction(input);
        });
        input.addEventListener('input', function () {
            handleScanInput(input);
        });
    });

    if (qtyInput && !qtyInput.classList.contains('scan-field')) {
        qtyInput.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') {
                return;
            }
            event.preventDefault();
            runScanAction(qtyInput);
        });
    }

    form.addEventListener('submit', function (event) {
        if (mode === 'add') {
            if (!puidValidated) {
                event.preventDefault();
                showMessage('warning', 'Scan PUID and load material data first.');
                puidInput?.focus();
                return;
            }
            const qty = parseFloat(String(qtyInput?.value || '').replace(/,/g, ''));
            if (!Number.isFinite(qty) || qty <= 0) {
                event.preventDefault();
                showMessage('warning', 'Enter Qty Remain greater than 0.');
                qtyInput?.focus();
                return;
            }
            if (addFetchInFlight || withdrawFetchInFlight || reservationFetchInFlight) {
                event.preventDefault();
                return;
            }
            setFetchButtonsDisabled(true);
            return;
        }
        if (mode !== 'withdraw') {
            return;
        }
        if (!isWorkOrderReady()) {
            event.preventDefault();
            showMessage('warning', 'Enter Work Order first.');
            workOrderInput?.focus();
            return;
        }
        if (!puidValidated) {
            event.preventDefault();
            showMessage('warning', 'Validate stock before confirming withdraw.');
            puidInput?.focus();
            return;
        }
        if (addFetchInFlight || withdrawFetchInFlight || reservationFetchInFlight) {
            event.preventDefault();
            return;
        }
        setFetchButtonsDisabled(true);
    });

    window.addEventListener('pageshow', function () {
        (workOrderInput || reservationInput || puidInput)?.focus();
    });
})();
