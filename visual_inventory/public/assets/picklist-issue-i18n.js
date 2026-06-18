/**
 * Picklist issue — concise bilingual alerts (TH/EN via window.PICKLIST_IS_EN).
 */
(function (global) {
    'use strict';

    function isEN() {
        return !!global.PICKLIST_IS_EN;
    }

    function t(en, th) {
        return isEN() ? en : th;
    }

    function msg(key, arg) {
        var map = {
            puid_required: [t('Scan a PUID first.', 'กรุณาสแกน PUID'), ''],
            picklist_required: [t('Select a picklist first.', 'กรุณาเลือก Picklist'), ''],
            puid_not_found: [t('PUID not found in warehouse.', 'ไม่พบ PUID ในคลัง'), ''],
            no_stock: [t('No stock — reel empty or withdrawn.', 'ไม่มีสต็อก — ม้วนว่างหรือเบิกแล้ว'), ''],
            part_not_on_picklist: [t('Part not on picklist: ', 'พาร์ทไม่อยู่ใน Picklist: '), ''],
            part_done: [t('Part fully issued: ', 'พาร์ทจ่ายครบแล้ว: '), ''],
            issue_failed: [t('Issue failed.', 'จ่ายไม่สำเร็จ'), ''],
            already_issued: [t('Already issued to this picklist.', 'จ่ายกับ Picklist นี้แล้ว'), ''],
            cpk_rejected: [t('CPK rejected — check PUID and picklist.', 'CPK ปฏิเสธ — ตรวจ PUID และ Picklist'), ''],
            network_error: [t('CPK connection failed.', 'เชื่อมต่อ CPK ไม่ได้'), ''],
            issuing: [t('Issuing…', 'กำลังจ่าย…'), ''],
            issued_ok: [t('Issued: ', 'จ่ายสำเร็จ: '), ''],
            verify_fail: [t('Cannot verify PUID.', 'ตรวจ PUID ไม่ได้'), ''],
            fifo_rec: [t('Use PUID: ', 'ใช้ PUID: '), '']
        };
        var pair = map[key] || map.issue_failed;
        return pair[0] + (arg != null && arg !== '' ? String(arg) : '');
    }

    function localizeIssueMessage(raw) {
        var text = String(raw || '').trim();
        if (!text) {
            return msg('issue_failed');
        }
        var lower = text.toLowerCase();
        if (lower.indexOf('already issued') >= 0 || text.indexOf('จ่ายกับ') >= 0 || text.indexOf('ถูกจ่าย') >= 0) {
            return msg('already_issued');
        }
        if (lower.indexOf('not found in inventory') >= 0 || lower.indexOf('puid not found') >= 0 || text.indexOf('ไม่พบ PUID') >= 0) {
            return msg('puid_not_found');
        }
        if (lower.indexOf('withdrawn') >= 0 || lower.indexOf('no issueable stock') >= 0 || text.indexOf('ไม่มีสต็อก') >= 0) {
            return msg('no_stock');
        }
        if (lower.indexOf('not on picklist') >= 0 || lower.indexOf('not in picklist') >= 0 || lower.indexOf('no material') >= 0) {
            return msg('cpk_rejected');
        }
        if (lower.indexOf('timeout') >= 0 || lower.indexOf('timed out') >= 0) {
            return msg('network_error');
        }
        if (text.indexOf('FIFO') >= 0 || text.indexOf('หมดอายุ') >= 0 || lower.indexOf('expired') >= 0 || text.indexOf('ไม่ใช่') >= 0) {
            return text;
        }
        if (!isEN() && /^[A-Za-z0-9\s.,!?\-_():]+$/.test(text)) {
            return msg('cpk_rejected');
        }
        return text;
    }

    function linePart(row, pickField) {
        return String(pickField(row, ['PartNumber', 'HanaPart', 'MatNumber', 'Material']) || '').trim();
    }

    function buildOpenParts(currentDetailItems, lineShowsOpenStatus, pickField) {
        var open = {};
        var all = {};
        (currentDetailItems || []).forEach(function (row) {
            var part = linePart(row, pickField);
            if (!part) {
                return;
            }
            all[part] = true;
            if (lineShowsOpenStatus(row)) {
                open[part] = true;
            }
        });
        return { open: open, all: all };
    }

    /**
     * @param {string} puid
     * @param {Array} currentDetailItems
     * @param {function} lineShowsOpenStatus
     * @param {function} pickField
     * @param {string} inventoryProxyUrl
     */
    function precheckIssuePuid(puid, currentDetailItems, lineShowsOpenStatus, pickField, inventoryProxyUrl) {
        var url = (inventoryProxyUrl || 'get_inventory_proxy.php') + '?puid=' + encodeURIComponent(puid);
        return fetch(url, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (res.status !== 'success' || !res.data) {
                    return { ok: false, message: msg('puid_not_found') };
                }
                var part = String(res.data.HanaPart || '').trim();
                var remain = parseInt(res.data.QtyRemain, 10) || 0;
                var status = String(res.data.StatusName || '');
                if (!part || remain <= 0 || /withdrawn|empty/i.test(status)) {
                    return { ok: false, message: msg('no_stock') };
                }
                var parts = buildOpenParts(currentDetailItems, lineShowsOpenStatus, pickField);
                if (!parts.open[part]) {
                    if (parts.all[part]) {
                        return { ok: false, message: msg('part_done', part) };
                    }
                    return { ok: false, message: msg('part_not_on_picklist', part) };
                }
                return { ok: true, part: part };
            })
            .catch(function () {
                return { ok: false, message: msg('verify_fail') };
            });
    }

    global.PicklistIssueI18n = {
        t: t,
        msg: msg,
        localizeIssueMessage: localizeIssueMessage,
        precheckIssuePuid: precheckIssuePuid
    };
})(typeof window !== 'undefined' ? window : this);
