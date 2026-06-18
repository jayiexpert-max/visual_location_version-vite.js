(function () {
    var apiBase = (document.body.dataset.apiBase || '../public').replace(/\/$/, '');
    var operator = document.body.dataset.operator || '';
    var isEN = document.body.dataset.isEn === '1';
    window.PICKLIST_IS_EN = isEN;
    var selectedPicklistId = '';
    var openPicklists = [];
    var picklistRemarks = {};
    var currentDetailItems = [];
    var picklistIssueState = {};

    var alertEl = document.getElementById('picklistAlert');
    var issueAlertEl = document.getElementById('issueAlert');
    var listView = document.getElementById('picklistListView');
    var issueView = document.getElementById('picklistIssueView');
    var cardsEl = document.getElementById('picklistCards');
    var detailEl = document.getElementById('detailCards');
    var puidInput = document.getElementById('puidInput');
    var scanIssueSection = document.getElementById('scanIssueSection');
    var scanCompleteMsg = document.getElementById('scanCompleteMsg');
    var btnIssue = document.getElementById('btnIssue');
    var closePicklistModal = document.getElementById('closePicklistModal');
    var closePicklistMessage = document.getElementById('closePicklistMessage');
    var closePicklistKitsNote = document.getElementById('closePicklistKitsNote');

    function t(en, th) {
        return isEN ? en : th;
    }

    function localizeIssueMsg(msg) {
        return (typeof PicklistIssueI18n !== 'undefined')
            ? PicklistIssueI18n.localizeIssueMessage(msg)
            : (msg || t('Issue failed.', 'จ่ายไม่สำเร็จ'));
    }

    function apiUrl(path) {
        return apiBase + '/' + String(path || '').replace(/^\//, '');
    }

    function issuePanelActive() {
        return issueView && !issueView.hidden;
    }

    function showAlert(type, message) {
        var cls = 'fx-alert ' + (type === 'success' ? 'fx-alert-success' : type === 'error' ? 'fx-alert-error' : 'fx-alert-warning');
        if (issuePanelActive() && issueAlertEl) {
            issueAlertEl.hidden = false;
            issueAlertEl.className = cls;
            issueAlertEl.textContent = message;
            if (alertEl) {
                alertEl.hidden = true;
            }
        } else if (alertEl) {
            alertEl.hidden = false;
            alertEl.className = cls;
            alertEl.textContent = message;
            if (issueAlertEl) {
                issueAlertEl.hidden = true;
            }
        }
    }

    function hideAlert() {
        if (alertEl) {
            alertEl.hidden = true;
        }
        if (issueAlertEl) {
            issueAlertEl.hidden = true;
        }
    }

    function cpkPost(call, body) {
        return fetch(apiUrl('api_gateway.php?call=cpk/' + call), {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {})
        }).then(function (r) {
            return r.text().then(function (text) {
                var data;
                try {
                    data = text ? JSON.parse(text) : {};
                } catch (e) {
                    throw new Error('Invalid API response (HTTP ' + r.status + ')');
                }
                if (!r.ok && (!data || !data.message)) {
                    throw new Error((data && data.message) || ('HTTP ' + r.status));
                }
                return data;
            });
        });
    }

    function pickField(row, keys) {
        for (var i = 0; i < keys.length; i++) {
            if (row[keys[i]] !== undefined && row[keys[i]] !== null && row[keys[i]] !== '') {
                return row[keys[i]];
            }
        }
        return '';
    }

    function picklistShowDate(row) {
        return String(pickField(row, ['ShowDate']) || '').trim();
    }

    function normalizeList(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.Picklists)) return data.Picklists;
        if (Array.isArray(data.OpenPicklists)) return data.OpenPicklists;
        if (Array.isArray(data.Items)) return data.Items;
        if (Array.isArray(data.List)) return data.List;
        return [];
    }

    function normalizeDetailItems(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.Lines)) return data.Lines;
        if (Array.isArray(data.Items)) return data.Items;
        if (Array.isArray(data.Materials)) return data.Materials;
        if (Array.isArray(data.PicklistItems)) return data.PicklistItems;
        return [];
    }

    function picklistDetailRequest(picklistId, requiredOnly) {
        return { PicklistID: picklistId, RequiredOnly: !!requiredOnly };
    }

    function normalizePuid(value) {
        return String(value || '').trim().toUpperCase().replace(/^VL/, '');
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    function escapeAttr(str) {
        return escapeHtml(str).replace(/"/g, '&quot;');
    }

    function extractSapItemCodeFromSapInfo(sapInfo) {
        var s = String(sapInfo || '').trim();
        if (!s) return '';
        var m = s.match(/([0-9]+)_\{/);
        if (m) return m[1];
        m = s.match(/NEW\s*-\s*([0-9]+)\s*$/i);
        if (m) return m[1];
        m = s.match(/^([0-9]+)\s*$/);
        if (m) return m[1];
        return '';
    }

    function extractReqQtyTokenFromSapInfo(sapInfo) {
        var m = String(sapInfo || '').match(/_\{([0-9]+(?:[.,][0-9]+)?)\}\s*$/);
        if (!m) return null;
        return m[1];
    }

    function parseReqQtyNumericFromSapInfo(sapInfo) {
        var token = extractReqQtyTokenFromSapInfo(sapInfo);
        if (token == null) return null;
        var qty = parseFloat(String(token).replace(',', '.'));
        return qty > 0 ? qty : null;
    }

    function lineRequiredQty(row) {
        var sap = pickField(row, ['SAP_Info', 'SAPInfo']);
        var fromSap = extractReqQtyTokenFromSapInfo(sap);
        if (fromSap != null) return fromSap;
        var legacy = pickField(row, ['QtyRequired', 'RequiredQty', 'ReqQty', 'Qty', 'Quantity']);
        return legacy !== '' && legacy != null ? String(legacy) : '';
    }

    function lineRequiredQtyNumeric(row) {
        var sap = pickField(row, ['SAP_Info', 'SAPInfo']);
        var fromSap = parseReqQtyNumericFromSapInfo(sap);
        if (fromSap != null) return fromSap;
        return parseFloat(pickField(row, ['QtyRequired', 'RequiredQty', 'ReqQty', 'Qty', 'Quantity'])) || 0;
    }

    function lineIsInactiveBomRow(row) {
        return lineRequiredQtyNumeric(row) <= 0;
    }

    function lineIsActiveForIssue(row) {
        return !lineIsInactiveBomRow(row);
    }

    function picklistMutedSpan(text) {
        return '<span class="fx-picklist-muted">' + escapeHtml(text || '—') + '</span>';
    }

    function formatReqDisplay(row) {
        var req = lineRequiredQty(row);
        if (lineIsInactiveBomRow(row) || !req) {
            return picklistMutedSpan('—');
        }
        return escapeHtml(req);
    }

    function linePuidIsXMark(row) {
        return lineRawPuid(row).toLowerCase() === 'x';
    }

    function formatPuidDisplay(row) {
        var puid = lineIssuedPuid(row);
        if (puid.length >= 4) {
            return escapeHtml(puid);
        }
        if (linePuidIsXMark(row)) {
            return picklistMutedSpan('x');
        }
        return picklistMutedSpan('—');
    }

    function lineWarehouseLocation(row) {
        var st = pickField(row, ['Station']);
        var slot = pickField(row, ['Slot']);
        var sub = pickField(row, ['SubSlot']);
        var parts = [];
        if (st !== '' && st != null) parts.push('St' + st);
        if (slot !== '' && slot != null) parts.push('Sl' + slot);
        if (sub !== '' && sub != null && String(sub) !== '0') parts.push('Sub' + sub);
        return parts.length ? parts.join('/') : (pickField(row, ['Location']) || '');
    }

    function lineRawPuid(row) {
        return String(pickField(row, [
            'PUID', 'IssuedPUID', 'PUIDIssued', 'Issued_PUID', 'puid'
        ]) || '').trim();
    }

    function lineIssuedPuid(row) {
        return normalizePuid(lineRawPuid(row));
    }

    function lineIsIssued(row) {
        var puid = lineIssuedPuid(row);
        if (puid.length >= 4) return true;
        var st = String(pickField(row, ['PicklistStatus', 'Status', 'LineStatus', 'ItemStatus']) || '').toLowerCase();
        if (st.indexOf('complete') >= 0 || st.indexOf('issued') >= 0 || st.indexOf('done') >= 0 || st === 'c'
            || st.indexOf('จ่ายสำเร็จ') >= 0 || st.indexOf('จ่ายแล้ว') >= 0) {
            return true;
        }
        var req = lineRequiredQtyNumeric(row);
        var iss = parseFloat(pickField(row, ['QtyIssued', 'IssuedQty', 'Issued'])) || 0;
        return req > 0 && iss >= req;
    }

    function lineShowsOpenStatus(row) {
        if (lineIsIssued(row)) return false;
        if (lineIsInactiveBomRow(row)) return false;
        if (linePuidIsXMark(row)) return false;
        return true;
    }

    function issueStateFromItems(items) {
        if (!items || !items.length) return 'open';
        if (!items.some(lineShowsOpenStatus)) return 'complete';
        if (items.some(lineIsIssued)) return 'partial';
        return 'open';
    }

    function picklistIdFromRow(row) {
        return pickField(row, ['PicklistID', 'Picklist#', 'PicklistNo', 'Picklist']);
    }

    function isPicklistMetaLine(row) {
        if (!row || typeof row !== 'object') return false;
        var part = String(pickField(row, ['PartNumber', 'HanaPart', 'MatNumber', 'Material']) || '').trim();
        if (!part) return false;
        var lower = part.toLowerCase();
        if (lower === 'request by' || lower === 'requestby'
            || lower === 'kitting room notes' || lower === 'kitting notes'
            || lower === 'notes' || lower === 'remark' || lower === 'requester') {
            return true;
        }
        var sap = String(pickField(row, ['SAP_Info', 'SAPInfo']) || '').trim();
        var puid = String(pickField(row, ['PUID']) || '').trim().toLowerCase();
        if (!sap && (puid === '' || puid === 'x') && !/\d{4,}/.test(part)) return true;
        return false;
    }

    function isPicklistRequestByLine(row) {
        var part = String(pickField(row, ['PartNumber', 'HanaPart', 'MatNumber', 'Material']) || '').trim().toLowerCase();
        return part === 'request by' || part === 'requestby';
    }

    function extractRequestByFromItems(items) {
        var i;
        for (i = items.length - 1; i >= 0; i--) {
            if (isPicklistRequestByLine(items[i])) {
                return pickField(items[i], [
                    'Remark', 'RequestBy', 'Request_By', 'RequestByName', 'RequestedBy', 'Requester'
                ]) || '';
            }
        }
        for (i = items.length - 1; i >= 0; i--) {
            if (isPicklistMetaLine(items[i])) {
                var remark = pickField(items[i], [
                    'Remark', 'RequestBy', 'Request_By', 'RequestByName', 'RequestedBy', 'Requester'
                ]);
                if (remark) return remark;
            }
        }
        return '';
    }

    function stripPicklistMetaLines(items) {
        var out = items.slice();
        while (out.length && isPicklistMetaLine(out[out.length - 1])) out.pop();
        return out;
    }

    function isPicklistPartLine(row) {
        if (isPicklistMetaLine(row)) return false;
        return !!pickField(row, [
            'PartNumber', 'HanaPart', 'MatNumber', 'Material', 'SAP_Info', 'SAPInfo',
            'QtyRequired', 'RequiredQty', 'Qty', 'Quantity'
        ]);
    }

    function extractRemarkFromCpkRow(row) {
        if (!row || typeof row !== 'object') return '';
        var direct = pickField(row, [
            'Remark', 'RequestBy', 'Request_By', 'RequestByName', 'RequestedBy', 'Requester'
        ]);
        if (direct) return direct;
        var nestedKeys = ['Items', 'Lines', 'Materials', 'PicklistItems', 'List', 'Data', 'Details'];
        for (var i = 0; i < nestedKeys.length; i++) {
            var arr = row[nestedKeys[i]];
            if (!Array.isArray(arr) || !arr.length) continue;
            var last = arr[arr.length - 1];
            if (typeof last === 'string' && String(last).trim()) return String(last).trim();
            if (last && typeof last === 'object') {
                var fromLast = pickField(last, [
                    'Remark', 'RequestBy', 'Request_By', 'RequestByName', 'RequestedBy', 'Requester'
                ]);
                if (fromLast) return fromLast;
            }
        }
        return '';
    }

    function parseOpenPicklistsResponse(data) {
        var list = normalizeList(data);
        var picklists = [];
        var remarks = {};
        list.forEach(function (row, idx) {
            var id = picklistIdFromRow(row);
            if (id) {
                picklists.push(row);
                var remark = extractRemarkFromCpkRow(row);
                if (remark) remarks[id] = remark;
                return;
            }
            if (idx === list.length - 1) {
                var tailRemark = extractRemarkFromCpkRow(row);
                var attachId = pickField(row, ['PicklistID', 'Picklist#', 'PicklistNo', 'Picklist']);
                if (!attachId && picklists.length) {
                    attachId = picklistIdFromRow(picklists[picklists.length - 1]);
                }
                if (tailRemark && attachId) remarks[attachId] = tailRemark;
            }
        });
        return { picklists: picklists, remarks: remarks };
    }

    function parsePicklistDetailData(data) {
        var remark = '';
        if (data && !Array.isArray(data) && typeof data === 'object') {
            remark = extractRemarkFromCpkRow(data);
            if (data.Meta && data.Meta.RequestBy) {
                remark = String(data.Meta.RequestBy);
            }
        }
        var items = normalizeDetailItems(data);
        var requestBy = extractRequestByFromItems(items);
        if (requestBy) remark = requestBy;
        items = stripPicklistMetaLines(items);
        if (items.length) {
            var last = items[items.length - 1];
            if (!isPicklistPartLine(last)) {
                var tailRemark = extractRemarkFromCpkRow(last);
                if (tailRemark) {
                    if (!remark) remark = tailRemark;
                    items = items.slice(0, -1);
                }
            }
        }
        return { items: items, remark: remark };
    }

    function picklistRequestBy(row) {
        var id = picklistIdFromRow(row);
        if (id && picklistRemarks[id]) return picklistRemarks[id];
        return extractRemarkFromCpkRow(row);
    }

    function issueStatusLabel(state) {
        if (state === 'complete') return 'Issue complete';
        if (state === 'partial') return 'Partial issue';
        if (state === 'loading') return 'Loading…';
        return 'Awaiting issue';
    }

    function issueStatusClass(state) {
        if (state === 'complete') return 'fx-badge-ok';
        if (state === 'partial') return 'fx-badge-partial';
        return 'fx-badge-open';
    }

    function lineStatusLabel(row) {
        if (lineIsIssued(row)) return 'Issued';
        if (lineIsInactiveBomRow(row)) return '—';
        if (linePuidIsXMark(row)) return '—';
        return 'Open';
    }

    function updateOpenPicklistPendingCount() {
        var el = document.getElementById('openPicklistCount');
        if (!el) return;
        var n = (typeof PicklistNotify !== 'undefined' && PicklistNotify.countPending)
            ? PicklistNotify.countPending(openPicklists, picklistIssueState)
            : openPicklists.length;
        el.textContent = String(n);
    }

    function setPicklistIssueState(id, state) {
        if (!id) return;
        picklistIssueState[id] = state;
        var card = cardsEl.querySelector('[data-id="' + escapeAttr(id) + '"]');
        if (card) {
            card.setAttribute('data-issue-state', state);
            var badge = card.querySelector('.hh-picklist-card-status');
            if (badge) {
                badge.className = 'hh-picklist-card-status fx-badge ' + issueStatusClass(state);
                badge.textContent = issueStatusLabel(state);
            }
        }
        updateOpenPicklistPendingCount();
    }

    function runTaskPool(taskFns, limit) {
        return new Promise(function (resolve) {
            if (!taskFns.length) {
                resolve();
                return;
            }
            var index = 0;
            var active = 0;
            var finished = 0;
            function pump() {
                if (finished >= taskFns.length) {
                    resolve();
                    return;
                }
                while (active < limit && index < taskFns.length) {
                    var fn = taskFns[index++];
                    active++;
                    Promise.resolve(fn()).finally(function () {
                        active--;
                        finished++;
                        pump();
                    });
                }
            }
            pump();
        });
    }

    function enrichPicklistIssueStatuses(list) {
        var tasks = list.map(function (row) {
            return function () {
                var id = picklistIdFromRow(row);
                if (!id) return Promise.resolve();
                if (typeof PicklistNotify !== 'undefined' && PicklistNotify.issueStateFromHeader) {
                    var fromHeader = PicklistNotify.issueStateFromHeader(row);
                    if (fromHeader !== null) {
                        setPicklistIssueState(id, fromHeader);
                        return Promise.resolve();
                    }
                }
                return cpkPost('get_picklist_detail.php', picklistDetailRequest(id, false))
                    .then(function (res) {
                        if (res.status === 'success') {
                            var parsed = parsePicklistDetailData(res.data);
                            if (parsed.remark) picklistRemarks[id] = parsed.remark;
                            setPicklistIssueState(id, issueStateFromItems(parsed.items));
                        } else {
                            setPicklistIssueState(id, 'open');
                        }
                    })
                    .catch(function () {
                        setPicklistIssueState(id, 'open');
                    });
            };
        });
        return runTaskPool(tasks, 4).then(function () {
            updateOpenPicklistPendingCount();
        });
    }

    function prunePicklistIssueState(list) {
        var ids = {};
        (list || []).forEach(function (row) {
            var id = picklistIdFromRow(row);
            if (id) ids[id] = true;
        });
        Object.keys(picklistIssueState).forEach(function (id) {
            if (!ids[id]) delete picklistIssueState[id];
        });
    }

    function renderPicklistCards(list) {
        openPicklists = list;
        prunePicklistIssueState(list);
        updateOpenPicklistPendingCount();

        if (!list.length) {
            cardsEl.innerHTML = '<p class="hh-picklist-empty">No open picklists.</p>';
            return;
        }

        cardsEl.innerHTML = list.map(function (row) {
            var id = picklistIdFromRow(row);
            var requestBy = picklistRequestBy(row);
            var line = pickField(row, ['Req_Line_Name', 'LineName', 'Line', 'ProductionLine']);
            var showDate = picklistShowDate(row);
            var issueState = picklistIssueState[id] || 'open';
            return '<article class="hh-picklist-card" data-id="' + escapeAttr(id) + '" data-remark="' + escapeAttr(requestBy) + '"' +
                ' data-issue-state="' + escapeAttr(issueState) + '">' +
                '<div class="hh-picklist-card-head">' +
                '<strong class="hh-picklist-card-id">' + escapeHtml(id) + '</strong>' +
                '<span class="hh-picklist-card-status fx-badge ' + issueStatusClass(issueState) + '">' +
                escapeHtml(issueStatusLabel(issueState)) + '</span></div>' +
                '<div class="hh-picklist-card-meta">' +
                '<span>Request: ' + (requestBy ? escapeHtml(requestBy) : '—') + '</span>' +
                '<span>Line: ' + escapeHtml(line || '—') + '</span>' +
                '<span>Date: ' + (showDate ? escapeHtml(showDate) : '—') + '</span></div>' +
                '<button type="button" class="fx-btn fx-btn-accent fx-btn--inline btn-select-picklist">Select</button>' +
                '</article>';
        }).join('');

        cardsEl.querySelectorAll('.btn-select-picklist').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var card = btn.closest('.hh-picklist-card');
                selectPicklist(card.getAttribute('data-id'));
            });
        });

        enrichPicklistIssueStatuses(list);
    }

    function showListView() {
        listView.hidden = false;
        issueView.hidden = true;
        selectedPicklistId = '';
        hideAlert();
    }

    function showIssueView() {
        listView.hidden = true;
        issueView.hidden = false;
    }

    function applyRequestByUi(id, requestBy) {
        if (!requestBy) return;
        picklistRemarks[id] = requestBy;
        document.getElementById('selectedPicklistLabel').textContent =
            id + ' — Request by: ' + requestBy;
    }

    function selectPicklist(id) {
        if (!id) return;
        selectedPicklistId = id;
        var listRow = openPicklists.find(function (r) { return picklistIdFromRow(r) === id; });
        var requestBy = picklistRemarks[id] || (listRow ? picklistRequestBy(listRow) : '');
        document.getElementById('selectedPicklistLabel').textContent = requestBy
            ? (id + ' — Request by: ' + requestBy)
            : id;

        showIssueView();
        detailEl.innerHTML = '<p class="hh-picklist-empty">Loading…</p>';
        if (scanIssueSection) scanIssueSection.hidden = false;
        if (scanCompleteMsg) scanCompleteMsg.hidden = true;
        if (puidInput) {
            puidInput.value = '';
            puidInput.disabled = false;
        }
        if (btnIssue) btnIssue.disabled = false;

        cpkPost('get_picklist_detail.php', picklistDetailRequest(id, false))
            .then(function (res) {
                if (res.status !== 'success') {
                    throw new Error(res.message || 'CPK error');
                }
                var parsedDetail = parsePicklistDetailData(res.data);
                if (parsedDetail.remark) {
                    applyRequestByUi(id, parsedDetail.remark);
                }
                renderDetail(parsedDetail.items);
                focusPuidInput();
            })
            .catch(function (err) {
                detailEl.innerHTML = '<p class="hh-picklist-empty">' + escapeHtml(err.message || 'Failed to load detail') + '</p>';
                showAlert('error', err.message || 'Failed to load picklist detail.');
            });
    }

    function findDetailRowIndexForIssue(puid, hanaPart) {
        puid = normalizePuid(puid);
        hanaPart = String(hanaPart || '').trim();
        var i;
        for (i = 0; i < currentDetailItems.length; i++) {
            if (!lineShowsOpenStatus(currentDetailItems[i])) {
                continue;
            }
            var rowPart = pickField(currentDetailItems[i], ['PartNumber', 'HanaPart', 'MatNumber', 'Material']);
            if (hanaPart && rowPart === hanaPart) {
                return i;
            }
        }
        for (i = 0; i < currentDetailItems.length; i++) {
            if (lineShowsOpenStatus(currentDetailItems[i])) {
                return i;
            }
        }
        for (i = 0; i < currentDetailItems.length; i++) {
            if (lineIssuedPuid(currentDetailItems[i]) === puid) {
                return i;
            }
        }
        return -1;
    }

    function markDetailItemIssued(puid, hanaPart) {
        puid = normalizePuid(puid);
        var idx = findDetailRowIndexForIssue(puid, hanaPart);
        if (idx >= 0) {
            currentDetailItems[idx] = Object.assign({}, currentDetailItems[idx], {
                PUID: puid,
                IssuedPUID: puid
            });
        }
        renderDetail(currentDetailItems);
    }

    function refreshPicklistDetailInBackground(delayMs) {
        if (!selectedPicklistId) {
            return;
        }
        window.setTimeout(function () {
            cpkPost('get_picklist_detail.php', picklistDetailRequest(selectedPicklistId, false))
                .then(function (detailRes) {
                    if (detailRes.status === 'success') {
                        var parsed = parsePicklistDetailData(detailRes.data);
                        if (parsed.remark && selectedPicklistId) {
                            applyRequestByUi(selectedPicklistId, parsed.remark);
                        }
                        renderDetail(parsed.items);
                    }
                })
                .catch(function () {});
            cpkPost('get_open_picklists.php', {})
                .then(function (openRes) {
                    if (openRes.status !== 'success') {
                        return;
                    }
                    var parsed = parseOpenPicklistsResponse(openRes.data);
                    picklistRemarks = Object.assign({}, picklistRemarks, parsed.remarks);
                    renderPicklistCards(parsed.picklists);
                })
                .catch(function () {});
        }, delayMs || 2500);
    }

    function updateScanIssueUi(items) {
        items = items || currentDetailItems;
        var allDone = items.length > 0 && !items.some(lineShowsOpenStatus);
        if (allDone) {
            if (scanIssueSection) scanIssueSection.hidden = true;
            if (scanCompleteMsg) {
                scanCompleteMsg.hidden = false;
                scanCompleteMsg.textContent = 'All lines issued — scanning disabled.';
            }
            if (puidInput) {
                puidInput.value = '';
                puidInput.disabled = true;
            }
            if (btnIssue) btnIssue.disabled = true;
            return;
        }
        if (scanIssueSection) scanIssueSection.hidden = false;
        if (scanCompleteMsg) scanCompleteMsg.hidden = true;
        if (puidInput) puidInput.disabled = false;
        if (btnIssue) btnIssue.disabled = false;
    }

    function renderDetail(items) {
        currentDetailItems = items;
        if (!items.length) {
            detailEl.innerHTML = '<p class="hh-picklist-empty">No line items returned.</p>';
            updateScanIssueUi(items);
            return;
        }

        detailEl.innerHTML = items.map(function (row) {
            var part = pickField(row, ['PartNumber', 'HanaPart', 'MatNumber', 'Material']);
            var sapInfo = pickField(row, ['SAP_Info', 'SAPInfo']);
            var lineName = pickField(row, ['LineName', 'Req_Line_Name', 'Line', 'ProductionLine']);
            var location = lineWarehouseLocation(row);
            var puid = lineIssuedPuid(row);
            var issued = lineIsIssued(row);
            var inactive = lineIsInactiveBomRow(row);
            var xMark = !issued && linePuidIsXMark(row) && lineIsActiveForIssue(row);
            var statusHtml = (inactive || xMark) && !issued
                ? picklistMutedSpan('—')
                : '<span class="fx-badge ' + (issued ? 'fx-badge-ok' : 'fx-badge-open') + '">' +
                    escapeHtml(lineStatusLabel(row)) + '</span>';
            return '<article class="hh-picklist-line' + (issued ? ' is-issued' : '') +
                (inactive && !issued ? ' is-inactive' : '') +
                (xMark ? ' is-marked-x' : '') + '" data-part="' + escapeAttr(part) + '"' +
                ' data-puid="' + escapeAttr(puid) + '" data-issued="' + (issued ? '1' : '0') + '"' +
                ' data-inactive="' + (inactive ? '1' : '0') + '">' +
                '<div class="hh-picklist-line-head"><strong>' + escapeHtml(part || '—') + '</strong>' +
                statusHtml + '</div>' +
                '<div class="hh-picklist-line-meta">' +
                '<span>Item: ' + escapeHtml(extractSapItemCodeFromSapInfo(sapInfo) || '—') + '</span>' +
                '<span>Required: ' + formatReqDisplay(row) + '</span>' +
                '<span>Reel: ' + formatPuidDisplay(row) + '</span>' +
                '<span>Line: ' + escapeHtml(lineName || '—') + '</span>' +
                '<span>Loc: ' + escapeHtml(location || '—') + '</span></div></article>';
        }).join('');

        updateScanIssueUi(items);
        if (selectedPicklistId) {
            setPicklistIssueState(selectedPicklistId, issueStateFromItems(items));
        }

        if (typeof HandheldHighlight !== 'undefined' && HandheldHighlight.bindMaterialLines) {
            HandheldHighlight.bindMaterialLines(detailEl, {
                actionType: 'picklist_search',
                onStatus: showAlert
            });
        }
    }

    function focusPuidInput() {
        window.requestAnimationFrame(function () {
            if (!puidInput || puidInput.disabled) return;
            puidInput.focus();
            puidInput.select();
        });
    }

    function findDetailByPuid(puid) {
        puid = normalizePuid(puid);
        if (!puid) return null;
        return detailEl.querySelector('[data-puid="' + escapeAttr(puid) + '"]');
    }

    function isAlreadyIssuedMessage(msg) {
        var m = String(msg || '').toLowerCase();
        return m.indexOf('already issued') >= 0
            || m.indexOf('issued to this picklist') >= 0
            || m.indexOf('issued to picklist') >= 0;
    }

    function loadOpenPicklists(resetState) {
        if (resetState) {
            picklistIssueState = {};
        }
        showAlert('warning', 'Loading open picklists from CPK…');
        cpkPost('get_open_picklists.php', {})
            .then(function (res) {
                if (res.status !== 'success') {
                    throw new Error(res.message || 'CPK error');
                }
                var parsed = parseOpenPicklistsResponse(res.data);
                picklistRemarks = Object.assign({}, picklistRemarks, parsed.remarks);
                hideAlert();
                renderPicklistCards(parsed.picklists);
            })
            .catch(function (err) {
                showAlert('error', 'Failed to load picklists: ' + err.message);
                cardsEl.innerHTML = '<p class="hh-picklist-empty">' + escapeHtml(err.message) + '</p>';
            });
    }

    function issuePuid() {
        var puid = normalizePuid(puidInput && puidInput.value);
        if (puidInput) puidInput.value = puid;
        if (!selectedPicklistId) {
            showAlert('warning', t('Select a picklist first.', 'กรุณาเลือก Picklist ก่อน'));
            return;
        }
        if (!puid) {
            showAlert('warning', t('Scan a PUID first.', 'กรุณาสแกน PUID'));
            focusPuidInput();
            return;
        }

        var knownRow = findDetailByPuid(puid);
        if (knownRow && knownRow.getAttribute('data-issued') === '1') {
            showAlert('success', t('Already issued: ', 'จ่ายแล้ว: ') + puid);
            focusPuidInput();
            return;
        }

        var precheck = (typeof PicklistIssueI18n !== 'undefined')
            ? PicklistIssueI18n.precheckIssuePuid(
                puid,
                currentDetailItems,
                lineShowsOpenStatus,
                pickField,
                apiUrl('get_inventory_proxy.php')
            )
            : Promise.resolve({ ok: true });

        precheck.then(function (check) {
            if (!check.ok) {
                showAlert('warning', check.message);
                focusPuidInput();
                return;
            }

            showAlert('warning', t('Issuing…', 'กำลังจ่าย…'));
            if (btnIssue) btnIssue.disabled = true;

            return cpkPost('issue_puid_to_picklist.php', {
                PicklistID: selectedPicklistId,
                PUID: puid,
                Operator: operator
            })
                .then(function (res) {
                    if (btnIssue) btnIssue.disabled = false;
                    if (res.status !== 'success') {
                        var msg = localizeIssueMsg(res.message || '');
                        if (isAlreadyIssuedMessage(msg) || isAlreadyIssuedMessage(res.message)) {
                            showAlert('success', t('Already issued: ', 'จ่ายแล้ว: ') + puid);
                            return cpkPost('get_picklist_detail.php', picklistDetailRequest(selectedPicklistId, false))
                                .then(function (detailRes) {
                                    if (detailRes.status === 'success') {
                                        renderDetail(parsePicklistDetailData(detailRes.data).items);
                                    }
                                    focusPuidInput();
                                });
                        }
                        throw new Error(msg);
                    }
                    showAlert('success', t('Issued: ', 'จ่ายสำเร็จ: ') + puid);
                    var issuedPart = '';
                    if (res.data && res.data.PUIDInfo) {
                        issuedPart = pickField(res.data.PUIDInfo, ['PartNumber', 'HanaPart', 'MatNumber', 'Material']);
                    }
                    markDetailItemIssued(puid, issuedPart);
                    if (puidInput) puidInput.value = '';
                    focusPuidInput();
                    refreshPicklistDetailInBackground(2500);
                })
                .catch(function (err) {
                    if (btnIssue) btnIssue.disabled = false;
                    showAlert('error', localizeIssueMsg(err.message || ''));
                    focusPuidInput();
                });
        });
    }

    function openClosePicklistModal() {
        if (!selectedPicklistId) {
            showAlert('warning', 'Select a picklist first.');
            return;
        }
        closePicklistMessage.innerHTML = 'Close picklist <b>' + escapeHtml(selectedPicklistId) +
            '</b> at CPK?<br>Operator: <b>' + escapeHtml(operator) + '</b>';
        closePicklistKitsNote.value = '';
        closePicklistModal.hidden = false;
    }

    function hideClosePicklistModal() {
        closePicklistModal.hidden = true;
    }

    function confirmClosePicklist() {
        if (!selectedPicklistId) {
            hideClosePicklistModal();
            return;
        }
        var kitsNote = (closePicklistKitsNote.value || '').trim();
        if (kitsNote.length > 200) {
            showAlert('warning', 'KitsNote must be at most 200 characters.');
            return;
        }

        showAlert('warning', 'Closing picklist…');
        cpkPost('close_picklist.php', {
            PicklistID: selectedPicklistId,
            Operator: operator,
            KitsNote: kitsNote
        })
            .then(function (res) {
                hideClosePicklistModal();
                var cpk = res.data || {};
                if (res.status !== 'success' || cpk.Status !== 'S' || !cpk.CloseDone) {
                    throw new Error(cpk.Message || res.message || 'Close failed.');
                }
                showAlert('success', 'Picklist closed: ' + selectedPicklistId);
                selectedPicklistId = '';
                showListView();
                loadOpenPicklists(true);
            })
            .catch(function (err) {
                showAlert('error', err.message || 'Close failed.');
            });
    }

    var scanDebounceTimer = null;
    var SCAN_DEBOUNCE_MS = 200;
    var SCAN_MIN_LEN = 4;

    function handlePuidScan() {
        var raw = puidInput.value || '';
        var hadSuffix = /[\r\n]/.test(raw);
        puidInput.value = normalizePuid(raw);
        if ((hadSuffix || puidInput.value.length >= SCAN_MIN_LEN) && puidInput.value) {
            window.clearTimeout(scanDebounceTimer);
            issuePuid();
            return;
        }
        window.clearTimeout(scanDebounceTimer);
        scanDebounceTimer = window.setTimeout(function () {
            puidInput.value = normalizePuid(puidInput.value);
            if (puidInput.value.length >= SCAN_MIN_LEN) {
                issuePuid();
            }
        }, SCAN_DEBOUNCE_MS);
    }

    document.getElementById('btnRefreshPicklists')?.addEventListener('click', function () {
        loadOpenPicklists(true);
    });
    document.getElementById('btnBackToList')?.addEventListener('click', showListView);
    document.getElementById('btnClosePicklist')?.addEventListener('click', openClosePicklistModal);
    document.getElementById('btnClosePicklistCancel')?.addEventListener('click', hideClosePicklistModal);
    document.getElementById('btnClosePicklistConfirm')?.addEventListener('click', confirmClosePicklist);
    document.getElementById('btnIssue')?.addEventListener('click', issuePuid);

    if (puidInput) {
        puidInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                issuePuid();
            }
        });
        puidInput.addEventListener('input', handlePuidScan);
    }

    closePicklistModal?.addEventListener('click', function (e) {
        if (e.target === closePicklistModal) {
            hideClosePicklistModal();
        }
    });

    loadOpenPicklists(true);
    window.setInterval(function () {
        if (!issuePanelActive()) {
            cpkPost('get_open_picklists.php', {})
                .then(function (res) {
                    if (res.status !== 'success') return;
                    var parsed = parseOpenPicklistsResponse(res.data);
                    picklistRemarks = Object.assign({}, picklistRemarks, parsed.remarks);
                    renderPicklistCards(parsed.picklists);
                })
                .catch(function () {});
        }
    }, 45000);
})();
