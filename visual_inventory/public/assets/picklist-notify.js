/**
 * Picklist new-arrival sound — once per new ID per browser session (sessionStorage).
 */
(function (global) {
    var STORAGE_KEY = 'fx_known_picklist_ids';
    var audioCtx = null;

    function picklistIdFromRow(row) {
        if (!row || typeof row !== 'object') {
            return '';
        }
        var keys = ['PicklistID', 'Picklist#', 'PicklistNo', 'Picklist'];
        for (var i = 0; i < keys.length; i++) {
            var v = row[keys[i]];
            if (v != null && String(v).trim() !== '') {
                return String(v).trim();
            }
        }
        return '';
    }

    function pickField(row, keys) {
        if (!row || typeof row !== 'object') {
            return '';
        }
        for (var i = 0; i < keys.length; i++) {
            if (row[keys[i]] !== undefined && row[keys[i]] !== null && row[keys[i]] !== '') {
                return row[keys[i]];
            }
        }
        return '';
    }

    function normalizePuid(value) {
        return String(value || '').trim().toUpperCase().replace(/^VL/, '');
    }

    /** CPK Reel_No is a line sequence — only non-empty PUID means issued. */
    function lineIssuedPuid(row) {
        return normalizePuid(pickField(row, [
            'PUID', 'IssuedPUID', 'PUIDIssued', 'Issued_PUID', 'puid'
        ]));
    }

    function statusImpliesComplete(st) {
        st = String(st || '').toLowerCase();
        return st.indexOf('complete') >= 0
            || st.indexOf('issued') >= 0
            || st.indexOf('done') >= 0
            || st.indexOf('closed') >= 0
            || st === 'c'
            || st.indexOf('จ่ายสำเร็จ') >= 0
            || st.indexOf('จ่ายแล้ว') >= 0
            || st.indexOf('จ่ายครบ') >= 0
            || st.indexOf('เสร็จ') >= 0;
    }

    function parseReqQtyNumericFromSapInfo(sapInfo) {
        var m = String(sapInfo || '').match(/_\{([0-9]+(?:[.,][0-9]+)?)\}\s*$/);
        if (!m) {
            return null;
        }
        var qty = parseFloat(String(m[1]).replace(',', '.'));
        return qty > 0 ? qty : null;
    }

    function lineRequiredQtyNumeric(row) {
        var sap = pickField(row, ['SAP_Info', 'SAPInfo']);
        var fromSap = parseReqQtyNumericFromSapInfo(sap);
        if (fromSap !== null) {
            return fromSap;
        }
        return parseFloat(pickField(row, ['QtyRequired', 'RequiredQty', 'ReqQty', 'Qty', 'Quantity'])) || 0;
    }

    function lineIsActiveForIssue(row) {
        return lineRequiredQtyNumeric(row) > 0;
    }

    function lineRawPuid(row) {
        return String(pickField(row, [
            'PUID', 'IssuedPUID', 'PUIDIssued', 'Issued_PUID', 'puid'
        ]) || '').trim();
    }

    function linePuidIsXMark(row) {
        return lineRawPuid(row).toLowerCase() === 'x';
    }

    function lineIsInactiveBomRow(row) {
        return lineRequiredQtyNumeric(row) <= 0;
    }

    function lineShowsOpenStatus(row) {
        if (lineIsIssued(row)) {
            return false;
        }
        if (lineIsInactiveBomRow(row)) {
            return false;
        }
        if (linePuidIsXMark(row)) {
            return false;
        }
        return true;
    }

    function lineIsIssued(row) {
        var puid = lineIssuedPuid(row);
        if (puid.length >= 4) {
            return true;
        }
        var st = String(pickField(row, ['PicklistStatus', 'Status', 'LineStatus', 'ItemStatus']) || '');
        if (statusImpliesComplete(st)) {
            return true;
        }
        var req = lineRequiredQtyNumeric(row);
        var iss = parseFloat(pickField(row, ['QtyIssued', 'IssuedQty', 'Issued'])) || 0;
        return req > 0 && iss >= req;
    }

    function issueStateFromItems(items) {
        if (!items || !items.length) {
            return 'open';
        }
        if (!items.some(lineShowsOpenStatus)) {
            return 'complete';
        }
        if (items.some(lineIsIssued)) {
            return 'partial';
        }
        return 'open';
    }

    function issueStateFromHeader(row) {
        if (!row || typeof row !== 'object') {
            return null;
        }
        var nested = row.items || row.Items || row.Lines || row.Materials || row.PicklistItems;
        if (Array.isArray(nested) && nested.length) {
            return issueStateFromItems(nested);
        }
        var st = String(pickField(row, ['Status', 'PicklistStatus', 'State', 'IssueStatus']) || '');
        if (statusImpliesComplete(st)) {
            return 'complete';
        }
        st = st.toLowerCase();
        if (st.indexOf('partial') >= 0 || st.indexOf('progress') >= 0) {
            return 'partial';
        }
        var pct = parseFloat(pickField(row, ['PercentIssued', 'IssuePercent', 'CompletionPercent', 'PercentComplete']));
        if (!isNaN(pct)) {
            if (pct >= 100) {
                return 'complete';
            }
            if (pct > 0) {
                return 'partial';
            }
        }
        var total = parseFloat(pickField(row, ['LineCount', 'TotalLines', 'ItemCount', 'TotalItems']));
        var done = parseFloat(pickField(row, ['LinesIssued', 'IssuedCount', 'CompletedLines', 'IssuedLines']));
        if (total > 0) {
            if (done >= total) {
                return 'complete';
            }
            if (done > 0) {
                return 'partial';
            }
        }
        return null;
    }

    function resolveIssueState(row, stateMap) {
        var id = picklistIdFromRow(row);
        if (stateMap && id && stateMap[id]) {
            return stateMap[id];
        }
        var fromHeader = issueStateFromHeader(row);
        if (fromHeader !== null) {
            return fromHeader;
        }
        return 'open';
    }

    function isPendingIssueState(state) {
        return state !== 'complete';
    }

    function normalizeList(data) {
        if (!data) {
            return [];
        }
        if (Array.isArray(data)) {
            return data;
        }
        if (Array.isArray(data.Picklists)) {
            return data.Picklists;
        }
        if (Array.isArray(data.OpenPicklists)) {
            return data.OpenPicklists;
        }
        if (Array.isArray(data.Items)) {
            return data.Items;
        }
        if (Array.isArray(data.List)) {
            return data.List;
        }
        return [];
    }

    function normalizeDetailItems(data) {
        if (!data) {
            return [];
        }
        if (Array.isArray(data)) {
            return data;
        }
        if (Array.isArray(data.Lines)) {
            return data.Lines;
        }
        if (Array.isArray(data.Items)) {
            return data.Items;
        }
        if (Array.isArray(data.Materials)) {
            return data.Materials;
        }
        if (Array.isArray(data.PicklistItems)) {
            return data.PicklistItems;
        }
        return [];
    }

    function issueStateRank(state) {
        if (state === 'complete') {
            return 3;
        }
        if (state === 'partial') {
            return 2;
        }
        if (state === 'open') {
            return 1;
        }
        return 0;
    }

    function resolveIssueStateCached(id, fromHeader, stateMap) {
        var cached = stateMap && id ? stateMap[id] : null;
        var next = fromHeader !== null ? fromHeader : (cached || 'open');
        if (cached && issueStateRank(cached) > issueStateRank(next)) {
            next = cached;
        }
        if (stateMap && id) {
            stateMap[id] = next;
        }
        return next;
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

    /**
     * Fetch picklist detail lines and set issue state (same rules as picklist_issue page).
     * Skips detail fetch only when cached/resolved state is already complete.
     *
     * @param {Array} list open picklist rows from CPK
     * @param {Record<string, string>} stateMap mutable id -> open|partial|complete
     * @param {{ fetchDetail: function(string): Promise<Array>, concurrency?: number }} options
     */
    function enrichIssueStates(list, stateMap, options) {
        options = options || {};
        var fetchDetail = options.fetchDetail;
        if (typeof fetchDetail !== 'function') {
            return Promise.resolve();
        }
        var limit = options.concurrency || 4;

        var tasks = (list || []).map(function (row) {
            return function () {
                var id = picklistIdFromRow(row);
                if (!id) {
                    return Promise.resolve();
                }
                var fromHeader = issueStateFromHeader(row);
                var resolved = resolveIssueStateCached(id, fromHeader, stateMap);
                if (issueStateRank(resolved) >= 3) {
                    return Promise.resolve();
                }
                return Promise.resolve(fetchDetail(id))
                    .then(function (items) {
                        stateMap[id] = issueStateFromItems(items);
                    })
                    .catch(function () {
                        if (issueStateRank(stateMap[id]) < 1) {
                            stateMap[id] = 'open';
                        }
                    });
            };
        });

        return runTaskPool(tasks, limit);
    }

    /**
     * Count picklists that still need issuing (excludes Issue complete).
     * @param {Array} picklists
     * @param {Record<string, string>} [stateMap] optional cached issue states
     */
    function countPending(picklists, stateMap) {
        var n = 0;
        (picklists || []).forEach(function (row) {
            if (isPendingIssueState(resolveIssueState(row, stateMap))) {
                n++;
            }
        });
        return n;
    }

    function extractIds(picklists, stateMap) {
        var ids = [];
        (picklists || []).forEach(function (row) {
            if (!isPendingIssueState(resolveIssueState(row, stateMap))) {
                return;
            }
            var id = picklistIdFromRow(row);
            if (id) {
                ids.push(id);
            }
        });
        return ids;
    }

    function loadKnown() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw === null) {
                return null;
            }
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : null;
        } catch (e) {
            return null;
        }
    }

    function saveKnown(ids) {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        } catch (e) { /* ignore */ }
    }

    function ensureAudio() {
        if (audioCtx) {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(function () {});
            }
            return audioCtx;
        }
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            return audioCtx;
        } catch (e) {
            return null;
        }
    }

    function playBeep() {
        var ctx = ensureAudio();
        if (!ctx) {
            return;
        }
        var now = ctx.currentTime;
        [880, 1175].forEach(function (freq, i) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            var t0 = now + i * 0.22;
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
            osc.start(t0);
            osc.stop(t0 + 0.18);
        });
    }

    function speakNewPicklist(newIds, isEN) {
        if (!('speechSynthesis' in window) || !newIds.length) {
            return;
        }
        window.speechSynthesis.cancel();
        var msg = isEN
            ? (newIds.length === 1 ? 'New picklist ' + newIds[0] : newIds.length + ' new picklists')
            : (newIds.length === 1 ? 'มี Picklist ใหม่ ' + newIds[0] : 'มี Picklist ใหม่ ' + newIds.length + ' รายการ');
        var utter = new SpeechSynthesisUtterance(msg);
        utter.lang = isEN ? 'en-US' : 'th-TH';
        utter.rate = isEN ? 0.95 : 0.92;
        window.speechSynthesis.speak(utter);
    }

    function picklistIdFromRowPublic(row) {
        return picklistIdFromRow(row);
    }

    function issueStateFromItemsPublic(items) {
        return issueStateFromItems(items);
    }

    var PicklistNotify = {
        normalizeList: normalizeList,
        normalizeDetailItems: normalizeDetailItems,
        countPending: countPending,
        resolveIssueState: resolveIssueState,
        issueStateFromHeader: issueStateFromHeader,
        issueStateFromItems: issueStateFromItemsPublic,
        enrichIssueStates: enrichIssueStates,
        picklistIdFromRow: picklistIdFromRowPublic,

        /**
         * @param {Array} picklists CPK open picklist rows
         * @returns {string[]} IDs that were not in the last known set (empty on first seed)
         */
        detectNew: function (picklists, stateMap) {
            var current = extractIds(picklists, stateMap);
            var known = loadKnown();
            if (known === null) {
                saveKnown(current);
                return [];
            }
            var knownSet = {};
            known.forEach(function (id) {
                knownSet[id] = true;
            });
            var fresh = current.filter(function (id) {
                return !knownSet[id];
            });
            saveKnown(current);
            return fresh;
        },

        alertNew: function (newIds, isEN) {
            if (!newIds || !newIds.length) {
                return;
            }
            playBeep();
            speakNewPicklist(newIds, !!isEN);
        },

        bindUnlock: function () {
            var unlock = function () {
                ensureAudio();
                document.removeEventListener('click', unlock);
                document.removeEventListener('keydown', unlock);
            };
            document.addEventListener('click', unlock);
            document.addEventListener('keydown', unlock);
        }
    };

    global.PicklistNotify = PicklistNotify;
})(typeof window !== 'undefined' ? window : this);
