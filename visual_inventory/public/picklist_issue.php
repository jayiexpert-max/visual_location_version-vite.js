<?php
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/session_check.php';

if (!role_can_warehouse_issue()) {
    $msg = __('logout') === 'Logout' ? 'Access denied' : 'ไม่มีสิทธิเข้าถึงหน้านี้';
    echo "<script>alert(" . json_encode($msg) . "); window.location.href='index';</script>";
    exit;
}

$isEN = ($_SESSION['lang'] ?? 'th') === 'en';
$page_title = $isEN ? 'Issue by Picklist' : 'จ่ายตาม Picklist';
$page_icon = 'fa-list-check';
$show_home = true;
$operator = htmlspecialchars($_SESSION['username'] ?? '');
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?></title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/picklist-issue.css?v=20260609">
</head>

<body class="factory-app factory-scan-page">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<?php require __DIR__ . '/includes/layout_status_bar.php'; ?>

<main class="fx-main fx-main--picklist">
    <div id="picklistAlert" class="fx-alert fx-alert-info" role="status">
        <?= $isEN ? 'Loading open picklists from CPK…' : 'กำลังโหลด Picklist จาก CPK…' ?>
    </div>

    <section class="fx-panel">
        <p class="fx-panel__title">
            <i class="fas fa-clipboard-list"></i>
            <span id="openPicklistTitle"><?= $isEN ? 'Picklists pending issue' : 'Picklist รอจ่าย' ?></span>
            (<span id="openPicklistCount">—</span>)
        </p>
        <div class="fx-table-wrap fx-picklist-list-table">
            <table class="fx-table fx-picklist-table" id="picklistTable">
                <colgroup>
                    <col class="fx-picklist-col-id">
                    <col class="fx-picklist-col-request">
                    <col class="fx-picklist-col-line">
                    <col class="fx-picklist-col-status">
                    <col class="fx-picklist-col-time">
                    <col class="fx-picklist-col-action">
                </colgroup>
                <thead>
                    <tr>
                        <th><?= $isEN ? 'Picklist ID' : 'Picklist' ?></th>
                        <th><?= $isEN ? 'Request by' : 'Request By' ?></th>
                        <th><?= $isEN ? 'Line' : 'ไลน์' ?></th>
                        <th><?= $isEN ? 'Issue status' : 'สถานะการจ่าย' ?></th>
                        <th><?= $isEN ? 'Date/Time' : 'วันที่/เวลา' ?></th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="picklistTableBody">
                    <tr><td colspan="6" class="fx-picklist-empty"><?= $isEN ? 'Loading…' : 'กำลังโหลด…' ?></td></tr>
                </tbody>
            </table>
        </div>
        <div class="fx-scan-toolbar" style="margin-top:0.75rem;">
            <button type="button" class="fx-btn fx-btn-secondary" id="btnRefreshPicklists">
                <i class="fas fa-sync-alt"></i> <?= $isEN ? 'Refresh list' : 'โหลดใหม่' ?>
            </button>
        </div>
    </section>

    <section class="fx-panel" id="issuePanel" hidden>
        <div class="fx-picklist-panel-head">
            <p class="fx-panel__title" style="margin:0;">
                <i class="fas fa-barcode"></i>
                <span id="selectedPicklistLabel">—</span>
            </p>
            <button type="button" class="fx-btn fx-btn-danger" id="btnClosePicklist" style="min-height:40px;">
                <i class="fas fa-door-closed"></i>
                <?= $isEN ? 'Close Picklist' : 'ปิด Picklist' ?>
            </button>
        </div>
        <p class="fx-panel__hint" style="margin:0 0 0.5rem;font-size:0.85rem;color:#64748b;">
            <?= $isEN
                ? 'Lines from CPK GetPicklistDetail (Station/Slot/SubSlot). Reel_No = issued PUID.'
                : 'รายการจาก CPK GetPicklistDetail (Station/Slot/SubSlot) — Reel_No = PUID ที่จ่ายแล้ว' ?>
        </p>
        <div class="fx-picklist-detail-toolbar" style="display:flex;flex-wrap:wrap;align-items:center;gap:0.75rem;margin:0 0 0.75rem;">
            <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.88rem;font-weight:600;color:#334155;cursor:pointer;">
                <input type="checkbox" id="requiredOnlyToggle">
                <?= $isEN
                    ? 'Required only (SAP_Info _{ReqQty})'
                    : 'เฉพาะแถวที่ต้องการ (SAP_Info _{ReqQty})' ?>
            </label>
            <span id="detailLineCount" style="font-size:0.85rem;color:#64748b;"></span>
        </div>

        <div class="fx-picklist-scan-sticky">
            <div id="issueAlert" class="fx-alert fx-alert-info" role="status" hidden></div>
            <div id="scanCompleteMsg" class="fx-alert fx-alert-success" role="status" hidden></div>

            <div id="scanIssueSection">
                <p class="fx-panel__title fx-picklist-scan-title" id="scanIssueTitle">
                    <i class="fas fa-qrcode"></i> <?= $isEN ? 'Scan PUID to issue' : 'สแกน PUID เพื่อจ่าย' ?>
                </p>
                <div class="fx-scan-row">
                    <input type="text" class="fx-scan-input" id="puidInput"
                        placeholder="<?= $isEN ? 'Scan PUID…' : 'สแกน PUID…' ?>" autocomplete="off">
                    <button type="button" class="fx-btn fx-btn-primary" id="btnIssue">
                        <?= $isEN ? 'Issue' : 'จ่าย' ?>
                    </button>
                </div>
            </div>
        </div>

        <div class="fx-table-wrap fx-picklist-detail-table">
            <table class="fx-table fx-picklist-table fx-picklist-detail-grid" id="detailTable">
                <colgroup>
                    <col class="fx-picklist-col-item">
                    <col class="fx-picklist-col-part">
                    <col class="fx-picklist-col-req">
                    <col class="fx-picklist-col-puid">
                    <col class="fx-picklist-col-line">
                    <col class="fx-picklist-col-loc">
                    <col class="fx-picklist-col-status">
                    <col class="fx-picklist-col-action">
                </colgroup>
                <thead>
                    <tr>
                        <th><?= $isEN ? 'Item' : 'รายการ' ?></th>
                        <th><?= $isEN ? 'Part' : 'พาร์ท' ?></th>
                        <th><?= $isEN ? 'Required' : 'ต้องการ' ?></th>
                        <th><?= $isEN ? 'Reel (PUID)' : 'Reel (PUID)' ?></th>
                        <th><?= $isEN ? 'Line' : 'ไลน์' ?></th>
                        <th><?= $isEN ? 'Location' : 'ตำแหน่ง' ?></th>
                        <th><?= $isEN ? 'Status' : 'สถานะ' ?></th>
                        <th>TV / 3D</th>
                    </tr>
                </thead>
                <tbody id="detailTableBody"></tbody>
            </table>
        </div>
    </section>
</main>

<div class="fx-picklist-close-modal" id="fifoRenewalModal" role="dialog" aria-modal="true" aria-labelledby="fifoRenewalTitle" hidden>
    <div class="fx-picklist-close-dialog fx-picklist-fifo-dialog">
        <h3 id="fifoRenewalTitle">
            <i class="fas fa-exclamation-triangle" style="color:#dc2626;"></i>
            <?= $isEN ? 'Expired rolls in warehouse' : 'มีม้วนหมดอายุในคลัง' ?>
        </h3>
        <div id="fifoRenewalBody" class="fx-picklist-fifo-body">—</div>
        <div class="fx-picklist-close-actions">
            <button type="button" class="fx-btn fx-btn-primary" id="btnFifoRenewalOk">
                <?= $isEN ? 'OK' : 'รับทราบ' ?>
            </button>
        </div>
    </div>
</div>

<div class="fx-picklist-close-modal" id="closePicklistModal" role="dialog" aria-modal="true" aria-labelledby="closePicklistTitle" hidden>
    <div class="fx-picklist-close-dialog">
        <h3 id="closePicklistTitle">
            <i class="fas fa-exclamation-triangle" style="color:#ea580c;"></i>
            <?= $isEN ? 'Confirm close picklist' : 'ยืนยันการปิด Picklist' ?>
        </h3>
        <p id="closePicklistMessage">—</p>
        <label for="closePicklistKitsNote"><?= $isEN ? 'Kitting note (optional, max 200)' : 'หมายเหตุ Kitting (ไม่บังคับ สูงสุด 200 ตัว)' ?></label>
        <textarea id="closePicklistKitsNote" maxlength="200"
            placeholder="<?= $isEN ? 'e.g. Closed after manual review' : 'เช่น ปิดหลังตรวจสอบด้วยตนเอง' ?>"></textarea>
        <div class="fx-picklist-close-actions">
            <button type="button" class="fx-btn fx-btn-secondary" id="btnClosePicklistCancel">
                <?= $isEN ? 'Cancel' : 'ยกเลิก' ?>
            </button>
            <button type="button" class="fx-btn fx-btn-danger" id="btnClosePicklistConfirm">
                <i class="fas fa-check"></i>
                <?= $isEN ? 'Confirm close' : 'ยืนยันปิด' ?>
            </button>
        </div>
    </div>
</div>

<?php require __DIR__ . '/includes/layout_footer.php'; ?>

<script src="assets/form-busy.js"></script>
<script src="assets/warehouse-highlight.js"></script>
<script src="assets/picklist-notify.js?v=20260609"></script>
<script>window.PICKLIST_IS_EN = <?= $isEN ? 'true' : 'false' ?>;</script>
<script src="assets/picklist-issue-i18n.js?v=20260612"></script>
<script>
(function () {
    var isEN = <?= $isEN ? 'true' : 'false' ?>;
    var operator = <?= json_encode($_SESSION['username'] ?? '') ?>;
    var selectedPicklistId = '';
    var requiredOnlyMode = false;
    var openPicklists = [];
    /** @type {Record<string, string>} PicklistID -> Request By from CPK Remark (last JSON set) */
    var picklistRemarks = {};
    var currentDetailItems = [];
    /** @type {Record<string, 'complete'|'partial'|'open'|'loading'>} */
    var picklistIssueState = {};
    var lastRenderedPicklistKey = '';

    var alertEl = document.getElementById('picklistAlert');
    var issueAlertEl = document.getElementById('issueAlert');
    var tableBody = document.getElementById('picklistTableBody');
    var detailBody = document.getElementById('detailTableBody');
    var issuePanel = document.getElementById('issuePanel');
    var puidInput = document.getElementById('puidInput');
    var scanIssueSection = document.getElementById('scanIssueSection');
    var scanCompleteMsg = document.getElementById('scanCompleteMsg');
    var btnIssue = document.getElementById('btnIssue');
    var btnClosePicklist = document.getElementById('btnClosePicklist');
    var closePicklistModal = document.getElementById('closePicklistModal');
    var closePicklistMessage = document.getElementById('closePicklistMessage');
    var closePicklistKitsNote = document.getElementById('closePicklistKitsNote');
    var btnClosePicklistCancel = document.getElementById('btnClosePicklistCancel');
    var btnClosePicklistConfirm = document.getElementById('btnClosePicklistConfirm');
    var fifoRenewalModal = document.getElementById('fifoRenewalModal');
    var fifoRenewalBody = document.getElementById('fifoRenewalBody');
    var btnFifoRenewalOk = document.getElementById('btnFifoRenewalOk');

    function t(en, th) { return isEN ? en : th; }

    function localizeIssueMsg(msg) {
        return (typeof PicklistIssueI18n !== 'undefined')
            ? PicklistIssueI18n.localizeIssueMessage(msg)
            : (msg || t('Issue failed.', 'จ่ายไม่สำเร็จ'));
    }

    function issuePanelActive() {
        return issuePanel && !issuePanel.hidden;
    }

    function showAlert(type, message) {
        var cls = 'fx-alert fx-alert-' + type;
        if (issuePanelActive() && issueAlertEl) {
            issueAlertEl.hidden = false;
            issueAlertEl.className = cls;
            issueAlertEl.textContent = message;
            alertEl.hidden = true;
        } else {
            alertEl.hidden = false;
            alertEl.className = cls;
            alertEl.textContent = message;
            if (issueAlertEl) {
                issueAlertEl.hidden = true;
            }
        }
    }

    function showAlertHtml(type, html) {
        var cls = 'fx-alert fx-alert-' + type;
        if (issuePanelActive() && issueAlertEl) {
            issueAlertEl.hidden = false;
            issueAlertEl.className = cls;
            issueAlertEl.innerHTML = html;
            alertEl.hidden = true;
        } else {
            alertEl.hidden = false;
            alertEl.className = cls;
            alertEl.innerHTML = html;
            if (issueAlertEl) {
                issueAlertEl.hidden = true;
            }
        }
    }

    function fifoRollRowsHtml(rolls, limit) {
        if (!rolls || !rolls.length) return '';
        var max = limit || 6;
        var rows = rolls.slice(0, max).map(function (row) {
            var puid = escapeHtml(row.puid || '');
            var exp = escapeHtml(row.expiration_display || row.expiration_date || '-');
            var loc = row.loc_box ? (' · ' + escapeHtml(row.loc_box)) : '';
            return '<li><b>' + puid + '</b> — ' + t('EXP', 'หมดอายุ') + ' ' + exp + loc + '</li>';
        }).join('');
        var more = rolls.length > max
            ? '<li class="fx-picklist-fifo-more">' + t('and ', 'และอีก ') + (rolls.length - max) + t(' more', ' ม้วน') + '</li>'
            : '';
        return '<ul class="fx-picklist-fifo-roll-list">' + rows + more + '</ul>';
    }

    function closeFifoRenewalModal() {
        if (!fifoRenewalModal) return;
        fifoRenewalModal.hidden = true;
        fifoRenewalModal.classList.remove('is-open');
    }

    function openFifoRenewalModal(fifoData, scannedPuid) {
        if (!fifoRenewalModal || !fifoRenewalBody) return;
        var rolls = (fifoData && fifoData.expired_rolls) || [];
        if (!rolls.length) return;

        var intro = scannedPuid
            ? (isEN
                ? 'Issued <b>' + escapeHtml(scannedPuid) + '</b>, but this part still has expired roll(s) in the warehouse. Send them for shelf-life extension.'
                : 'จ่าย <b>' + escapeHtml(scannedPuid) + '</b> แล้ว แต่พาร์ทนี้ยังมีม้วนหมดอายุในคลัง — กรุณานำส่งต่ออายุ')
            : (isEN
                ? 'This part has expired roll(s) in the warehouse. Send them for shelf-life extension before use.'
                : 'พาร์ทนี้มีม้วนหมดอายุในคลัง — กรุณานำส่งต่ออายุก่อนนำไปใช้งาน');

        fifoRenewalBody.innerHTML = '<p>' + intro + '</p>' + fifoRollRowsHtml(rolls, 8);
        fifoRenewalModal.hidden = false;
        fifoRenewalModal.classList.add('is-open');
    }

    function showFifoIssueError(message, fifoData) {
        var html = escapeHtml(localizeIssueMsg(message));
        if (fifoData && fifoData.recommended_puid) {
            html += ' · ' + t('Use: ', 'ใช้: ') + '<b>' + escapeHtml(fifoData.recommended_puid) + '</b>';
        }
        if (fifoData && fifoData.expired_rolls && fifoData.expired_rolls.length) {
            html += '<div class="fx-picklist-fifo-inline">' +
                t('Expired:', 'หมดอายุ:') +
                fifoRollRowsHtml(fifoData.expired_rolls, 4) + '</div>';
        }
        showAlertHtml('error', html);
        if (fifoData && fifoData.renewal_required) {
            openFifoRenewalModal(fifoData, '');
        }
    }

    function hideAlert() {
        alertEl.hidden = true;
        if (issueAlertEl) {
            issueAlertEl.hidden = true;
        }
    }

    function cpkPost(call, body) {
        return fetch('api_gateway.php?call=cpk/' + call, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {})
        }).then(function (r) {
            return r.text().then(function (text) {
                var data;
                try {
                    data = text ? JSON.parse(text) : {};
                } catch (e) {
                    throw new Error(t('Invalid API response', 'ตอบกลับ API ไม่ถูกต้อง') + ' (HTTP ' + r.status + ')');
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

    /** CPK GetOpenPicklists — ShowDate e.g. "09 Jun 2026 08:53 AM" */
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

    function picklistDetailRequest(picklistId) {
        return { PicklistID: picklistId, RequiredOnly: !!requiredOnlyMode };
    }

    function updateDetailLineCount(meta, itemCount) {
        var el = document.getElementById('detailLineCount');
        if (!el) {
            return;
        }
        if (!meta && !itemCount) {
            el.textContent = '';
            return;
        }
        var shown = itemCount != null ? itemCount : (meta && meta.LineCount);
        var raw = meta && meta.LineCountRaw;
        if (raw != null && shown != null && raw !== shown) {
            el.textContent = t(
                'Showing ' + shown + ' of ' + raw + ' lines from CPK',
                'แสดง ' + shown + ' จาก ' + raw + ' แถวจาก CPK'
            );
        } else if (shown != null) {
            el.textContent = t(shown + ' line(s) from CPK', shown + ' แถวจาก CPK');
        } else {
            el.textContent = '';
        }
    }

    function applyPicklistDetailResponse(id, res, selectedTr) {
        var parsedDetail = parsePicklistDetailData(res.data);
        var requestBy = (res.data && res.data.Meta && res.data.Meta.RequestBy)
            ? String(res.data.Meta.RequestBy)
            : parsedDetail.remark;
        if (requestBy) {
            applyRequestByUi(id, requestBy, selectedTr);
        }
        var meta = res.data && res.data.Meta;
        updateDetailLineCount(meta, parsedDetail.items.length);
        if (meta && meta.RequiredOnlyRequested && meta.LineCountRaw > meta.LineCount) {
            showAlert('info', t(
                'Required-only filter active — ' + meta.LineCount + ' of ' + meta.LineCountRaw + ' lines.',
                'กรองเฉพาะแถวที่ต้องการ — ' + meta.LineCount + ' จาก ' + meta.LineCountRaw + ' แถว'
            ));
        } else {
            hideAlert();
        }
        renderDetail(parsedDetail.items);
        focusPuidInput();
    }

    function reloadSelectedPicklistDetail() {
        if (!selectedPicklistId) {
            return Promise.resolve();
        }
        var selectedTr = tableBody.querySelector('tr[data-id="' + escapeAttr(selectedPicklistId) + '"]');
        detailBody.innerHTML = '<tr><td colspan="8" class="fx-picklist-empty">' + t('Loading…', 'กำลังโหลด…') + '</td></tr>';
        return cpkPost('get_picklist_detail.php', picklistDetailRequest(selectedPicklistId))
            .then(function (res) {
                if (res.status !== 'success') {
                    throw new Error(res.message || 'CPK error');
                }
                applyPicklistDetailResponse(selectedPicklistId, res, selectedTr);
            })
            .catch(function (err) {
                var listRow = openPicklists.find(function (r) { return picklistIdFromRow(r) === selectedPicklistId; });
                detailBody.innerHTML = '<tr><td colspan="8" class="fx-picklist-empty">' +
                    formatPicklistDetailError(selectedPicklistId, err, listRow) + '</td></tr>';
                showAlert('error', err.message || t('Failed to load picklist detail.', 'โหลดรายละเอียด Picklist ไม่สำเร็จ'));
            });
    }

    function formatPicklistDetailError(id, err, listRow) {
        var msg = escapeHtml(err.message || String(err));
        var extra = '';
        if (listRow) {
            extra += '<br><small>' + t('Open list:', 'รายการ Open:') + ' ' +
                escapeHtml(pickField(listRow, ['LineName', 'Req_Line_Name', 'Line']) || '—') +
                ' · ' + t('Status', 'สถานะ') + ' ' +
                escapeHtml(String(pickField(listRow, ['PicklistStatus', 'Status']) || '—')) +
                (picklistShowDate(listRow)
                    ? ' · ' + escapeHtml(picklistShowDate(listRow))
                    : '') +
                '</small>';
        }
        if (/00008|ERR_CODE/i.test(String(err.message || err))) {
            extra += '<br><strong style="color:#b45309;">' +
                t(
                    'CPK server cannot load this picklist detail (ERR_CODE#00008). The picklist shows in Open list but GetPicklistDetail fails — contact CPK/IT to fix picklist data on the server.',
                    'CPK โหลดรายละเอียด Picklist นี้ไม่ได้ (ERR_CODE#00008) — มีใน Open list แต่ GetPicklistDetail ล้มเหลว แจ้งทีม CPK/IT ตรวจข้อมูลบน server'
                ) + '</strong>';
        }
        return msg + extra;
    }

    function extractSapItemCodeFromSapInfo(sapInfo) {
        var s = String(sapInfo || '').trim();
        if (!s) {
            return '';
        }
        var m = s.match(/([0-9]+)_\{/);
        if (m) {
            return m[1];
        }
        m = s.match(/NEW\s*-\s*([0-9]+)\s*$/i);
        if (m) {
            return m[1];
        }
        m = s.match(/^([0-9]+)\s*$/);
        if (m) {
            return m[1];
        }
        return '';
    }

    function formatPartCellHtml(part, wo) {
        var html = '<strong>' + escapeHtml(part || '—') + '</strong>';
        if (wo) {
            html += '<br><small style="color:#64748b;">WO ' + escapeHtml(wo) + '</small>';
        }
        return html;
    }

    function formatItemCellHtml(sapInfo) {
        var itemCode = extractSapItemCodeFromSapInfo(sapInfo);
        if (!itemCode) {
            return '<span style="color:#94a3b8;">—</span>';
        }
        return '<span class="fx-picklist-sap-item">' + escapeHtml(itemCode) + '</span>';
    }

    function extractReqQtyTokenFromSapInfo(sapInfo) {
        var m = String(sapInfo || '').match(/_\{([0-9]+(?:[.,][0-9]+)?)\}\s*$/);
        if (!m) {
            return null;
        }
        return m[1];
    }

    function parseReqQtyNumericFromSapInfo(sapInfo) {
        var token = extractReqQtyTokenFromSapInfo(sapInfo);
        if (token == null) {
            return null;
        }
        var qty = parseFloat(String(token).replace(',', '.'));
        return qty > 0 ? qty : null;
    }

    function lineRequiredQty(row) {
        var sap = pickField(row, ['SAP_Info', 'SAPInfo']);
        var fromSap = extractReqQtyTokenFromSapInfo(sap);
        if (fromSap != null) {
            return fromSap;
        }
        var legacy = pickField(row, ['QtyRequired', 'RequiredQty', 'ReqQty', 'Qty', 'Quantity']);
        return legacy !== '' && legacy != null ? String(legacy) : '';
    }

    function lineRequiredQtyNumeric(row) {
        var sap = pickField(row, ['SAP_Info', 'SAPInfo']);
        var fromSap = parseReqQtyNumericFromSapInfo(sap);
        if (fromSap != null) {
            return fromSap;
        }
        return parseFloat(pickField(row, ['QtyRequired', 'RequiredQty', 'ReqQty', 'Qty', 'Quantity'])) || 0;
    }

    /** BOM reference line — shown but not required for picklist issue. */
    function lineIsInactiveBomRow(row) {
        return lineRequiredQtyNumeric(row) <= 0;
    }

    function lineIsActiveForIssue(row) {
        return !lineIsInactiveBomRow(row);
    }

    function picklistMutedCell(text) {
        return '<span class="fx-picklist-muted">' + escapeHtml(text || '—') + '</span>';
    }

    function formatReqCellHtml(row) {
        var req = lineRequiredQty(row);
        if (lineIsInactiveBomRow(row) || !req) {
            return picklistMutedCell('—');
        }
        return escapeHtml(req);
    }

    function linePuidIsXMark(row) {
        return lineRawPuid(row).toLowerCase() === 'x';
    }

    function formatPuidCellHtml(row) {
        var puid = lineIssuedPuid(row);
        if (puid.length >= 4) {
            return '<span class="fx-picklist-puid">' + escapeHtml(puid) + '</span>';
        }
        if (linePuidIsXMark(row)) {
            return picklistMutedCell('x');
        }
        return picklistMutedCell('—');
    }

    function lineWarehouseLocation(row) {
        var st = pickField(row, ['Station']);
        var slot = pickField(row, ['Slot']);
        var sub = pickField(row, ['SubSlot']);
        var parts = [];
        if (st !== '' && st != null) {
            parts.push('St' + st);
        }
        if (slot !== '' && slot != null) {
            parts.push('Sl' + slot);
        }
        if (sub !== '' && sub != null && String(sub) !== '0') {
            parts.push('Sub' + sub);
        }
        return parts.length ? parts.join('/') : (pickField(row, ['Location']) || '');
    }

    function normalizePuid(value) {
        return String(value || '').trim().toUpperCase().replace(/^VL/, '');
    }

    function focusPuidInput() {
        requestAnimationFrame(function () {
            if (!puidInput || puidInput.disabled) {
                return;
            }
            puidInput.focus();
            puidInput.select();
        });
    }

    function statusBadge(status) {
        var s = String(status || 'Open').toLowerCase();
        if (s.indexOf('rush') >= 0) return '<span class="fx-badge fx-badge-rush">Rush</span>';
        if (s.indexOf('complete') >= 0 || s === 'c') return '<span class="fx-badge fx-badge-ok">Done</span>';
        return '<span class="fx-badge fx-badge-open">Open</span>';
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
        if (puid.length >= 4) {
            return true;
        }
        var st = String(pickField(row, ['PicklistStatus', 'Status', 'LineStatus', 'ItemStatus']) || '').toLowerCase();
        if (st.indexOf('complete') >= 0 || st.indexOf('issued') >= 0 || st.indexOf('done') >= 0 || st === 'c'
            || st.indexOf('จ่ายสำเร็จ') >= 0 || st.indexOf('จ่ายแล้ว') >= 0) {
            return true;
        }
        var req = lineRequiredQtyNumeric(row);
        var iss = parseFloat(pickField(row, ['QtyIssued', 'IssuedQty', 'Issued'])) || 0;
        return req > 0 && iss >= req;
    }

    function lineStatusBadge(row) {
        if (lineIsIssued(row)) {
            return '<span class="fx-badge fx-badge-ok">' + t('Issued', 'จ่ายแล้ว') + '</span>';
        }
        if (lineIsInactiveBomRow(row)) {
            return picklistMutedCell('—');
        }
        if (linePuidIsXMark(row)) {
            return picklistMutedCell('—');
        }
        return statusBadge(pickField(row, ['PicklistStatus', 'Status', 'LineStatus', 'ItemStatus']));
    }

    /** Line still shows Open badge — counts as pending issue on picklist header. */
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

    function picklistIdFromRow(row) {
        return pickField(row, ['PicklistID', 'Picklist#', 'PicklistNo', 'Picklist']);
    }

    function isPicklistMetaLine(row) {
        if (!row || typeof row !== 'object') {
            return false;
        }
        var part = String(pickField(row, ['PartNumber', 'HanaPart', 'MatNumber', 'Material']) || '').trim();
        if (!part) {
            return false;
        }
        var lower = part.toLowerCase();
        if (lower === 'request by' || lower === 'requestby'
            || lower === 'kitting room notes' || lower === 'kitting notes'
            || lower === 'notes' || lower === 'remark' || lower === 'requester') {
            return true;
        }
        var sap = String(pickField(row, ['SAP_Info', 'SAPInfo']) || '').trim();
        var puid = String(pickField(row, ['PUID']) || '').trim().toLowerCase();
        if (!sap && (puid === '' || puid === 'x') && !/\d{4,}/.test(part)) {
            return true;
        }
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
                if (remark) {
                    return remark;
                }
            }
        }
        return '';
    }

    function stripPicklistMetaLines(items) {
        var out = items.slice();
        while (out.length && isPicklistMetaLine(out[out.length - 1])) {
            out.pop();
        }
        return out;
    }

    function isPicklistPartLine(row) {
        if (isPicklistMetaLine(row)) {
            return false;
        }
        return !!pickField(row, [
            'PartNumber', 'HanaPart', 'MatNumber', 'Material', 'SAP_Info', 'SAPInfo',
            'QtyRequired', 'RequiredQty', 'Qty', 'Quantity'
        ]);
    }

    /** Remark มักอยู่ชุด JSON สุดท้าย (ท้าย array หรือ object สรุป) */
    function extractRemarkFromCpkRow(row) {
        if (!row || typeof row !== 'object') {
            return '';
        }
        var direct = pickField(row, [
            'Remark', 'RequestBy', 'Request_By', 'RequestByName', 'RequestedBy', 'Requester'
        ]);
        if (direct) {
            return direct;
        }
        var nestedKeys = ['Items', 'Lines', 'Materials', 'PicklistItems', 'List', 'Data', 'Details'];
        for (var i = 0; i < nestedKeys.length; i++) {
            var arr = row[nestedKeys[i]];
            if (!Array.isArray(arr) || !arr.length) {
                continue;
            }
            var last = arr[arr.length - 1];
            if (typeof last === 'string' && String(last).trim()) {
                return String(last).trim();
            }
            if (last && typeof last === 'object') {
                var fromLast = pickField(last, [
                    'Remark', 'RequestBy', 'Request_By', 'RequestByName', 'RequestedBy', 'Requester'
                ]);
                if (fromLast) {
                    return fromLast;
                }
                if (!isPicklistPartLine(last)) {
                    fromLast = pickField(last, ['Value', 'Text', 'Code', 'EmployeeID', 'EmpID']);
                    if (fromLast) {
                        return fromLast;
                    }
                }
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
                if (remark) {
                    remarks[id] = remark;
                }
                return;
            }
            if (idx === list.length - 1) {
                var tailRemark = extractRemarkFromCpkRow(row);
                var attachId = pickField(row, ['PicklistID', 'Picklist#', 'PicklistNo', 'Picklist']);
                if (!attachId && picklists.length) {
                    attachId = picklistIdFromRow(picklists[picklists.length - 1]);
                }
                if (tailRemark && attachId) {
                    remarks[attachId] = tailRemark;
                }
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
        if (requestBy) {
            remark = requestBy;
        }
        items = stripPicklistMetaLines(items);
        if (items.length) {
            var last = items[items.length - 1];
            if (!isPicklistPartLine(last)) {
                var tailRemark = extractRemarkFromCpkRow(last);
                if (tailRemark) {
                    if (!remark) {
                        remark = tailRemark;
                    }
                    items = items.slice(0, -1);
                }
            }
        }
        return { items: items, remark: remark };
    }

    function picklistRequestBy(row) {
        var id = picklistIdFromRow(row);
        if (id && picklistRemarks[id]) {
            return picklistRemarks[id];
        }
        return extractRemarkFromCpkRow(row);
    }

    function applyRequestByUi(id, requestBy, selectedTr) {
        if (!requestBy) {
            return;
        }
        picklistRemarks[id] = requestBy;
        var label = id + ' — ' + t('Request by', 'Request By') + ': ' + requestBy;
        document.getElementById('selectedPicklistLabel').textContent = label;
        if (!selectedTr) {
            selectedTr = tableBody.querySelector('tr[data-id="' + escapeAttr(id) + '"]');
        }
        if (selectedTr) {
            selectedTr.setAttribute('data-remark', requestBy);
            var reqCell = selectedTr.querySelector('.fx-picklist-request-by');
            if (reqCell) {
                reqCell.textContent = requestBy;
            }
        }
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

    function picklistIssueStateFromHeader(row) {
        var nested = row.items || row.Items || row.Lines || row.Materials || row.PicklistItems;
        if (Array.isArray(nested) && nested.length) {
            return issueStateFromItems(nested);
        }
        var st = String(pickField(row, ['Status', 'PicklistStatus', 'State', 'IssueStatus']) || '');
        if (st.indexOf('จ่ายสำเร็จ') >= 0 || st.indexOf('จ่ายแล้ว') >= 0 || st.indexOf('จ่ายครบ') >= 0) {
            return 'complete';
        }
        st = st.toLowerCase();
        if (st.indexOf('complete') >= 0 || st.indexOf('issued') >= 0 || st.indexOf('done') >= 0 || st.indexOf('closed') >= 0) {
            return 'complete';
        }
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

    function picklistIssueStatusBadge(state, cpkStatus) {
        var parts = [];
        if (state === 'complete') {
            parts.push('<span class="fx-badge fx-badge-ok">' + t('Issue complete', 'จ่ายสำเร็จ') + '</span>');
        } else if (state === 'partial') {
            parts.push('<span class="fx-badge fx-badge-rush">' + t('Partial issue', 'จ่ายบางส่วน') + '</span>');
        } else if (state === 'loading') {
            parts.push('<span class="fx-badge" style="background:#e2e8f0;color:#64748b;">…</span>');
        } else {
            parts.push('<span class="fx-badge fx-badge-open">' + t('Awaiting issue', 'รอจ่าย') + '</span>');
        }
        var s = String(cpkStatus || '').toLowerCase();
        if (s.indexOf('rush') >= 0) {
            parts.push('<span class="fx-badge fx-badge-rush">Rush</span>');
        }
        return parts.join(' ');
    }

    function updateOpenPicklistPendingCount() {
        var el = document.getElementById('openPicklistCount');
        if (!el) {
            return;
        }
        var n = (typeof PicklistNotify !== 'undefined' && PicklistNotify.countPending)
            ? PicklistNotify.countPending(openPicklists, picklistIssueState)
            : openPicklists.length;
        el.textContent = String(n);
    }

    function setPicklistIssueState(id, state) {
        if (!id) {
            return;
        }
        picklistIssueState[id] = state;
        updatePicklistRowIssueStatus(id, state);
        updateOpenPicklistPendingCount();
    }

    function updatePicklistRowIssueStatus(id, state) {
        var tr = tableBody.querySelector('tr[data-id="' + escapeAttr(id) + '"]');
        if (!tr) {
            return;
        }
        tr.classList.toggle('fx-picklist-list-complete', state === 'complete');
        tr.classList.toggle('fx-picklist-list-partial', state === 'partial');
        tr.setAttribute('data-issue-state', state);
        var cell = tr.querySelector('.fx-picklist-issue-status');
        if (!cell) {
            return;
        }
        var row = openPicklists.find(function (r) { return picklistIdFromRow(r) === id; });
        var cpkSt = row ? pickField(row, ['Status', 'PicklistStatus', 'State']) : '';
        cell.innerHTML = picklistIssueStatusBadge(state, cpkSt);
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
                if (!id) {
                    return Promise.resolve();
                }
                var fromHeader = picklistIssueStateFromHeader(row);
                var resolved = resolvePicklistIssueState(id, fromHeader);
                setPicklistIssueState(id, resolved);
                if (picklistIssueStateRank(resolved) >= 3) {
                    return Promise.resolve();
                }
                return cpkPost('get_picklist_detail.php', picklistDetailRequest(id))
                    .then(function (res) {
                        if (res.status === 'success') {
                            var parsed = parsePicklistDetailData(res.data);
                            if (parsed.remark) {
                                picklistRemarks[id] = parsed.remark;
                            }
                            setPicklistIssueState(id, issueStateFromItems(parsed.items));
                        } else if (picklistIssueStateRank(picklistIssueState[id] || '') < 1) {
                            setPicklistIssueState(id, 'open');
                        }
                    })
                    .catch(function () {
                        if (picklistIssueStateRank(picklistIssueState[id] || '') < 1) {
                            setPicklistIssueState(id, 'open');
                        }
                    });
            };
        });
        return runTaskPool(tasks, 4).then(function () {
            updateOpenPicklistPendingCount();
        });
    }

    function isAlreadyIssuedMessage(msg) {
        var m = String(msg || '').toLowerCase();
        return m.indexOf('already issued') >= 0
            || m.indexOf('ถูกจ่าย') >= 0
            || m.indexOf('จ่ายกับ picklist') >= 0;
    }

    function extractPuidFromMessage(msg, fallback) {
        var m = String(msg || '');
        var paren = m.match(/\(([A-Z0-9]+)\)/i);
        if (paren && paren[1]) {
            return normalizePuid(paren[1]);
        }
        return normalizePuid(fallback);
    }

    function findDetailRowByPuid(puid) {
        puid = normalizePuid(puid);
        if (!puid) {
            return null;
        }
        return detailBody.querySelector('tr[data-puid="' + escapeAttr(puid) + '"]');
    }

    /** Highlight issued row in the table only — TV/3D map is sent via search button (searchWarehouseLocation). */
    function highlightIssuedRow(puid) {
        var rowEl = findDetailRowByPuid(puid);
        detailBody.querySelectorAll('tr[data-part]').forEach(function (tr) {
            tr.classList.remove('fx-picklist-selected');
        });
        if (rowEl) {
            rowEl.classList.add('fx-picklist-selected');
            rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    function updateScanIssueUi(items) {
        items = items || currentDetailItems;
        var allDone = items.length > 0 && !items.some(lineShowsOpenStatus);
        if (allDone) {
            if (scanIssueSection) {
                scanIssueSection.hidden = true;
            }
            if (scanCompleteMsg) {
                scanCompleteMsg.hidden = false;
                scanCompleteMsg.textContent = t(
                    'All lines issued for this picklist — scanning is disabled.',
                    'จ่ายครบทุกรายการแล้ว — ปิดการสแกนจ่ายซ้ำ'
                );
            }
            if (puidInput) {
                puidInput.value = '';
                puidInput.disabled = true;
            }
            if (btnIssue) {
                btnIssue.disabled = true;
            }
            return;
        }
        if (scanIssueSection) {
            scanIssueSection.hidden = false;
        }
        if (scanCompleteMsg) {
            scanCompleteMsg.hidden = true;
        }
        if (puidInput) {
            puidInput.disabled = false;
        }
        if (btnIssue) {
            btnIssue.disabled = false;
        }
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
            currentDetailItems[idx].PUID = puid;
            currentDetailItems[idx].IssuedPUID = puid;
        }
        patchIssuedRowDom(puid, hanaPart);
        updateScanIssueUi(currentDetailItems);
        if (selectedPicklistId) {
            setPicklistIssueState(selectedPicklistId, issueStateFromItems(currentDetailItems));
        }
    }

    function refreshPicklistDetailInBackground(delayMs) {
        if (!selectedPicklistId) {
            return;
        }
        window.setTimeout(function () {
            cpkPost('get_picklist_detail.php', picklistDetailRequest(selectedPicklistId))
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
            pollOpenPicklists();
        }, delayMs || 2500);
    }

    function patchIssuedRowDom(puid, hanaPart) {
        puid = normalizePuid(puid);
        var tr = findDetailRowByPuid(puid);
        if (!tr && hanaPart) {
            tr = detailBody.querySelector('tr[data-part="' + escapeAttr(hanaPart) + '"]');
        }
        if (!tr) {
            return;
        }
        tr.setAttribute('data-puid', puid);
        tr.setAttribute('data-issued', '1');
        tr.classList.add('fx-picklist-issued');
        var puidCell = tr.querySelector('.fx-picklist-puid');
        if (puidCell) {
            puidCell.textContent = puid;
        } else if (tr.cells && tr.cells.length > 3) {
            tr.cells[3].innerHTML = '<span class="fx-picklist-puid">' + escapeHtml(puid) + '</span>';
        }
        if (tr.cells && tr.cells.length > 6) {
            tr.cells[6].innerHTML = '<span class="fx-badge fx-badge-ok">' + t('Issued', 'จ่ายแล้ว') + '</span>';
        }
    }

    function handleAlreadyIssued(puid, message) {
        puid = normalizePuid(puid);
        showAlert('success', t('Already issued: ', 'จ่ายแล้ว: ') + puid);
        if (puidInput) {
            puidInput.value = '';
        }

        function afterDetailLoaded() {
            patchIssuedRowDom(puid, '');
            highlightIssuedRow(puid);
            updateScanIssueUi(currentDetailItems);
        }

        cpkPost('get_picklist_detail.php', picklistDetailRequest(selectedPicklistId))
            .then(function (res) {
                if (res.status === 'success') {
                    renderDetail(parsePicklistDetailData(res.data).items);
                }
                if (findDetailRowByPuid(puid)) {
                    afterDetailLoaded();
                    return;
                }
                return fetch('get_inventory_proxy.php?puid=' + encodeURIComponent(puid) + '&hanapart=', {
                    credentials: 'same-origin'
                })
                    .then(function (r) { return r.json(); })
                    .then(function (proxy) {
                        var part = (proxy.status === 'success' && proxy.data) ? (proxy.data.HanaPart || '') : '';
                        patchIssuedRowDom(puid, part);
                        highlightIssuedRow(puid);
                        updateScanIssueUi(currentDetailItems);
                    });
            })
            .catch(function () {
                patchIssuedRowDom(puid, '');
                highlightIssuedRow(puid);
            });
    }

    function picklistIdsKey(list) {
        return (list || []).map(function (row) {
            return picklistIdFromRow(row);
        }).filter(Boolean).sort().join('|');
    }

    function picklistIssueStateRank(state) {
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

    /** Keep cached complete/partial when list header is stale (prevents green/white flicker on re-render). */
    function resolvePicklistIssueState(id, fromHeader) {
        var cached = picklistIssueState[id];
        var next = fromHeader !== null ? fromHeader : (cached || 'loading');
        if (cached && picklistIssueStateRank(cached) > picklistIssueStateRank(next)) {
            next = cached;
        }
        picklistIssueState[id] = next;
        return next;
    }

    function prunePicklistIssueState(list) {
        var ids = {};
        (list || []).forEach(function (row) {
            var id = picklistIdFromRow(row);
            if (id) {
                ids[id] = true;
            }
        });
        Object.keys(picklistIssueState).forEach(function (id) {
            if (!ids[id]) {
                delete picklistIssueState[id];
            }
        });
    }

    function renderPicklists(list) {
        openPicklists = list;
        prunePicklistIssueState(list);
        updateOpenPicklistPendingCount();

        if (!list.length) {
            tableBody.innerHTML = '<tr><td colspan="6" class="fx-picklist-empty">' +
                t('No open picklists.', 'ไม่มี Picklist รอจ่าย') + '</td></tr>';
            issuePanel.hidden = true;
            return;
        }

        tableBody.innerHTML = list.map(function (row) {
            var id = picklistIdFromRow(row);
            var requestBy = picklistRequestBy(row);
            var line = pickField(row, ['Req_Line_Name', 'LineName', 'Line', 'ProductionLine']);
            var cpkStatus = pickField(row, ['Status', 'PicklistStatus', 'State']) || 'Open';
            var showDate = picklistShowDate(row);
            var fromHeader = picklistIssueStateFromHeader(row);
            var issueState = resolvePicklistIssueState(id, fromHeader);
            var rowClasses = [];
            if (issueState === 'complete') {
                rowClasses.push('fx-picklist-list-complete');
            } else if (issueState === 'partial') {
                rowClasses.push('fx-picklist-list-partial');
            }
            return '<tr class="' + rowClasses.join(' ') + '" data-id="' + escapeAttr(id) + '" data-remark="' + escapeAttr(requestBy) + '"' +
                ' data-issue-state="' + escapeAttr(issueState) + '">' +
                '<td><strong>' + escapeHtml(id) + '</strong></td>' +
                '<td><span class="fx-picklist-request-by">' + (requestBy ? escapeHtml(requestBy) : '—') + '</span></td>' +
                '<td>' + escapeHtml(line || '—') + '</td>' +
                '<td class="fx-picklist-issue-status">' + picklistIssueStatusBadge(issueState, cpkStatus) + '</td>' +
                '<td class="fx-picklist-show-date">' + (showDate ? escapeHtml(showDate) : '—') + '</td>' +
                '<td><button type="button" class="fx-btn fx-btn-accent btn-select" style="min-height:36px;padding:0 12px;font-size:0.85rem;">' +
                t('Select', 'เลือก') + '</button></td></tr>';
        }).join('');

        enrichPicklistIssueStatuses(list);

        tableBody.querySelectorAll('.btn-select').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tr = btn.closest('tr');
                selectPicklist(tr.getAttribute('data-id'));
            });
        });
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    function escapeAttr(str) {
        return escapeHtml(str).replace(/"/g, '&quot;');
    }

    function applyOpenPicklists(parsed, options) {
        options = options || {};
        var newIds = (typeof PicklistNotify !== 'undefined')
            ? PicklistNotify.detectNew(parsed.picklists, picklistIssueState)
            : [];
        if (newIds.length > 0) {
            PicklistNotify.alertNew(newIds, isEN);
            showAlert('success', t('New picklist(s): ', 'มี Picklist ใหม่: ') + newIds.join(', '));
        } else if (!options.silent) {
            hideAlert();
        }
        picklistRemarks = Object.assign({}, picklistRemarks, parsed.remarks);

        var list = parsed.picklists || [];
        var idsKey = picklistIdsKey(list);
        if (options.silent && idsKey === lastRenderedPicklistKey && tableBody.querySelector('tr[data-id]')) {
            openPicklists = list;
            updateOpenPicklistPendingCount();
            return;
        }
        lastRenderedPicklistKey = idsKey;
        renderPicklists(list);
    }

    function loadOpenPicklists(resetState) {
        if (resetState) {
            picklistIssueState = {};
            picklistRemarks = {};
            lastRenderedPicklistKey = '';
        }
        showAlert('info', t('Loading open picklists from CPK…', 'กำลังโหลด Picklist จาก CPK…'));
        cpkPost('get_open_picklists.php', {})
            .then(function (res) {
                if (res.status !== 'success') {
                    throw new Error(res.message || 'CPK error');
                }
                applyOpenPicklists(parseOpenPicklistsResponse(res.data), { silent: false });
            })
            .catch(function (err) {
                showAlert('error', t('Failed to load picklists: ', 'โหลด Picklist ไม่สำเร็จ: ') + err.message);
                tableBody.innerHTML = '<tr><td colspan="6" class="fx-picklist-empty">' + escapeHtml(err.message) + '</td></tr>';
            });
    }

    function pollOpenPicklists() {
        cpkPost('get_open_picklists.php', {})
            .then(function (res) {
                if (res.status !== 'success') {
                    return;
                }
                applyOpenPicklists(parseOpenPicklistsResponse(res.data), { silent: true });
            })
            .catch(function () {});
    }

    function selectPicklist(id) {
        if (!id) return;
        selectedPicklistId = id;
        var selectedTr = tableBody.querySelector('tr[data-id="' + escapeAttr(id) + '"]');
        var listRow = openPicklists.find(function (r) { return picklistIdFromRow(r) === id; });
        var requestBy = picklistRemarks[id] || (listRow ? picklistRequestBy(listRow) : '') ||
            (selectedTr ? selectedTr.getAttribute('data-remark') : '') || '';
        document.getElementById('selectedPicklistLabel').textContent = requestBy
            ? (id + ' — ' + t('Request by', 'Request By') + ': ' + requestBy)
            : id;

        tableBody.querySelectorAll('tr').forEach(function (tr) {
            tr.classList.toggle('fx-picklist-selected', tr.getAttribute('data-id') === id);
        });

        issuePanel.hidden = false;
        detailBody.innerHTML = '<tr><td colspan="8" class="fx-picklist-empty">' + t('Loading…', 'กำลังโหลด…') + '</td></tr>';
        if (scanIssueSection) {
            scanIssueSection.hidden = false;
        }
        if (scanCompleteMsg) {
            scanCompleteMsg.hidden = true;
        }
        puidInput.value = '';
        puidInput.disabled = false;
        btnIssue.disabled = false;

        cpkPost('get_picklist_detail.php', picklistDetailRequest(id))
            .then(function (res) {
                if (res.status !== 'success') {
                    throw new Error(res.message || 'CPK error');
                }
                applyPicklistDetailResponse(id, res, selectedTr);
            })
            .catch(function (err) {
                var listRow = openPicklists.find(function (r) { return picklistIdFromRow(r) === id; });
                detailBody.innerHTML = '<tr><td colspan="8" class="fx-picklist-empty">' +
                    formatPicklistDetailError(id, err, listRow) + '</td></tr>';
                showAlert('error', err.message || t('Failed to load picklist detail.', 'โหลดรายละเอียด Picklist ไม่สำเร็จ'));
            });
    }

    function renderDetail(items) {
        items = (items || []).filter(function (row) {
            return !isPicklistMetaLine(row);
        });
        currentDetailItems = items;
        if (!items.length) {
            detailBody.innerHTML = '<tr><td colspan="8" class="fx-picklist-empty">' +
                t('No line items returned.', 'ไม่มีรายการใน Picklist') + '</td></tr>';
            updateScanIssueUi(items);
            focusPuidInput();
            return;
        }

        var searchLabel = <?= json_encode(__('search_btn')) ?>;

        detailBody.innerHTML = items.map(function (row) {
            var part = pickField(row, ['HanaPart', 'PartNumber', 'MatNumber', 'Material']);
            var sapInfo = pickField(row, ['SAP_Info', 'SAPInfo']);
            var lineName = pickField(row, ['LineName', 'Req_Line_Name', 'Line', 'ProductionLine']);
            var location = lineWarehouseLocation(row);
            var wo = pickField(row, ['WorkOrder']);
            var puid = lineIssuedPuid(row);
            var issued = lineIsIssued(row);
            var inactive = lineIsInactiveBomRow(row);
            var xMark = !issued && linePuidIsXMark(row) && lineIsActiveForIssue(row);
            var rowClass = issued ? 'fx-picklist-issued' : (inactive ? 'fx-picklist-inactive' : (xMark ? 'fx-picklist-marked-x' : ''));
            var itemCell = formatItemCellHtml(sapInfo);
            var partCell = formatPartCellHtml(part, wo);
            var reqTitle = sapInfo ? ' title="' + escapeAttr(sapInfo) + '"' : '';
            return '<tr class="' + rowClass + '" data-part="' + escapeAttr(part) + '" data-puid="' + escapeAttr(puid) + '"' +
                ' data-issued="' + (issued ? '1' : '0') + '" data-inactive="' + (inactive ? '1' : '0') + '"><td>' + itemCell + '</td><td>' + partCell + '</td>' +
                '<td' + reqTitle + '>' + formatReqCellHtml(row) + '</td>' +
                '<td>' + formatPuidCellHtml(row) + '</td>' +
                '<td>' + escapeHtml(lineName || '—') + '</td>' +
                '<td>' + escapeHtml(location || '—') + '</td>' +
                '<td>' + lineStatusBadge(row) + '</td>' +
                '<td><button type="button" class="fx-btn fx-btn-accent btn-search-part" data-part="' + escapeAttr(part) + '"' +
                (part ? '' : ' disabled') + ' style="min-height:36px;padding:0 12px;font-size:0.85rem;white-space:nowrap;">' +
                '<i class="fas fa-search"></i> ' + escapeHtml(searchLabel) + '</button></td></tr>';
        }).join('');

        updateScanIssueUi(items);
        if (selectedPicklistId) {
            setPicklistIssueState(selectedPicklistId, issueStateFromItems(items));
        }

        detailBody.querySelectorAll('.btn-search-part').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var part = btn.getAttribute('data-part') || '';
                detailBody.querySelectorAll('tr[data-part]').forEach(function (tr) {
                    tr.classList.toggle('fx-picklist-selected', tr.getAttribute('data-part') === part);
                });
                searchWarehouseLocation(part, btn);
            });
        });
    }

    function buildLocationSearchPayload(raw) {
        var payload = { action_type: 'picklist_search' };
        if (/^\d{10,}$/.test(raw)) {
            payload.puid = raw;
        } else {
            payload.material_code = raw;
        }
        return payload;
    }

    function formatHighlightLocation(res) {
        var h = (res && res.highlight) ? res.highlight : {};
        var parts = [h.rack_name, h.level_no != null && h.level_no !== '' ? 'L' + h.level_no : '', h.box_code, h.slot_no != null && h.slot_no !== '' ? 'S' + h.slot_no : '']
            .filter(function (p) { return p; });
        return parts.length ? parts.join(' / ') : '';
    }

    function highlightSucceeded(res) {
        return res && res.status === 'success';
    }

    function finishHighlightSearch(raw, res, triggerBtn) {
        FormBusy.end('picklist:highlight');
        if (triggerBtn) {
            triggerBtn.disabled = false;
        }
        if (highlightSucceeded(res)) {
            var loc = formatHighlightLocation(res);
            var h = (res && res.highlight) ? res.highlight : {};
            var fifoHint = h.puid ? (' · FIFO PUID ' + h.puid) : '';
            showAlert('success', (h.product_name || raw) + ' — ' + t('Shown on TV & 3D', 'แสดงบน TV & 3D แล้ว') +
                (loc ? ': ' + loc : '') + fifoHint);
            return;
        }
        showAlert('error', (res && res.message) || (raw + ' — ' + t('Not in warehouse.', 'ไม่พบในคลัง')));
    }

    /** Resolve FIFO location server-side, then push TV/3D/IO (avoids wrong slot / part mismatch). */
    function pushPicklistHighlight(raw) {
        return fetch('api_gateway.php?call=highlight_location.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ trigger_io: true }, buildLocationSearchPayload(raw)))
        }).then(function (r) { return r.json(); });
    }

    function searchWarehouseLocation(part, triggerBtn) {
        var raw = String(part || '').trim().toUpperCase().replace(/^VL/, '');
        if (!raw) {
            showAlert('warning', t('No part number on this line.', 'แถวนี้ไม่มีรหัสพาร์ท'));
            return;
        }
        if ((typeof isWarehouseHighlightBusy === 'function' && isWarehouseHighlightBusy()) ||
            (typeof FormBusy !== 'undefined' && FormBusy.isBusy('picklist:highlight'))) {
            showAlert('info', t('TV & 3D update in progress…', 'กำลังส่งแสดงบน TV & 3D อยู่ — รอสักครู่'));
            return;
        }
        if (!FormBusy.tryBegin('picklist:highlight')) {
            return;
        }

        showAlert('info', t('Sending to TV & 3D…', 'กำลังส่งแสดงบน TV & 3D…') + ' ' + raw);
        if (triggerBtn) {
            triggerBtn.disabled = true;
        }

        pushPicklistHighlight(raw)
            .then(function (res) {
                finishHighlightSearch(raw, res, triggerBtn);
            })
            .catch(function (err) {
                finishHighlightSearch(raw, { status: 'error', message: err.message }, triggerBtn);
            });
    }

    function issuePuid() {
        var puid = normalizePuid(puidInput.value);
        puidInput.value = puid;
        if (!selectedPicklistId) {
            showAlert('warning', t('Select a picklist first.', 'กรุณาเลือก Picklist ก่อน'));
            return;
        }
        if (!puid) {
            showAlert('warning', t('Scan a PUID first.', 'กรุณาสแกน PUID'));
            puidInput.focus();
            return;
        }

        var knownIssuedRow = findDetailRowByPuid(puid);
        if (knownIssuedRow && knownIssuedRow.getAttribute('data-issued') === '1') {
            handleAlreadyIssued(puid, '');
            return;
        }
        if (!FormBusy.tryBegin('picklist:issue')) {
            return;
        }

        var precheck = (typeof PicklistIssueI18n !== 'undefined')
            ? PicklistIssueI18n.precheckIssuePuid(puid, currentDetailItems, lineShowsOpenStatus, pickField, 'get_inventory_proxy.php')
            : Promise.resolve({ ok: true });

        precheck.then(function (check) {
            if (!check.ok) {
                FormBusy.end('picklist:issue');
                showAlert('warning', check.message);
                focusPuidInput();
                return;
            }

            showAlert('info', t('Issuing…', 'กำลังจ่าย…'));
            btnIssue.disabled = true;
            FormBusy.setButtons(true, [{ id: 'btnIssue', busyHtml: '<i class="fas fa-spinner fa-spin"></i> ' + t('Issuing…', 'กำลังจ่าย…') }]);
            FormBusy.setInputs(true, ['puidInput']);

            return cpkPost('issue_puid_to_picklist.php', {
                PicklistID: selectedPicklistId,
                PUID: puid,
                Operator: operator
            })
                .then(function (res) {
                    FormBusy.end('picklist:issue');
                    FormBusy.setButtons(false, [{ id: 'btnIssue' }]);
                    FormBusy.setInputs(false, ['puidInput']);
                    btnIssue.disabled = false;
                    if (res.status !== 'success') {
                        var msg = localizeIssueMsg(res.message || '');
                        if (isAlreadyIssuedMessage(msg) || isAlreadyIssuedMessage(res.message)) {
                            handleAlreadyIssued(extractPuidFromMessage(res.message, puid), msg);
                            return;
                        }
                        showFifoIssueError(msg, res.data);
                        focusPuidInput();
                        return;
                    }
                    showAlert('success', t('Issued: ', 'จ่ายสำเร็จ: ') + puid);
                    if (res.data && res.data.fifo_renewal_notice && res.data.fifo) {
                        openFifoRenewalModal(res.data.fifo, puid);
                    }
                    var issuedPart = '';
                    if (res.data && res.data.PUIDInfo) {
                        issuedPart = pickField(res.data.PUIDInfo, ['PartNumber', 'HanaPart', 'MatNumber', 'Material']);
                    }
                    markDetailItemIssued(puid, issuedPart);
                    highlightIssuedRow(puid);
                    puidInput.value = '';
                    focusPuidInput();
                    refreshPicklistDetailInBackground(2500);
                })
                .catch(function (err) {
                    FormBusy.end('picklist:issue');
                    FormBusy.setButtons(false, [{ id: 'btnIssue' }]);
                    FormBusy.setInputs(false, ['puidInput']);
                    btnIssue.disabled = false;
                    var msg = localizeIssueMsg(err.message || '');
                    if (isAlreadyIssuedMessage(msg) || isAlreadyIssuedMessage(err.message)) {
                        handleAlreadyIssued(extractPuidFromMessage(err.message, puid), msg);
                        return;
                    }
                    showAlert('error', msg);
                    focusPuidInput();
                });
        });
    }

    function openClosePicklistModal() {
        if (!selectedPicklistId) {
            showAlert('warning', t('Select a picklist first.', 'กรุณาเลือก Picklist ก่อน'));
            return;
        }
        closePicklistMessage.innerHTML = t(
            'Close picklist <b>' + escapeHtml(selectedPicklistId) + '</b> at CPK?<br>Operator: <b>' + escapeHtml(operator) + '</b><br><small>This sets status 9003 (manual close). Cannot be undone from this screen.</small>',
            'ปิด Picklist <b>' + escapeHtml(selectedPicklistId) + '</b> ที่ CPK?<br>ผู้ดำเนินการ: <b>' + escapeHtml(operator) + '</b><br><small>ระบบจะตั้งสถานะ 9003 (ปิด Manual) — ยกเลิกจากหน้านี้ไม่ได้</small>'
        );
        closePicklistKitsNote.value = '';
        closePicklistModal.hidden = false;
        closePicklistModal.classList.add('is-open');
        closePicklistKitsNote.focus();
    }

    function hideClosePicklistModal() {
        closePicklistModal.classList.remove('is-open');
        closePicklistModal.hidden = true;
    }

    function confirmClosePicklist() {
        if (!selectedPicklistId) {
            hideClosePicklistModal();
            return;
        }
        var kitsNote = (closePicklistKitsNote.value || '').trim();
        if (kitsNote.length > 200) {
            showAlert('warning', t('KitsNote must be at most 200 characters.', 'หมายเหตุต้องไม่เกิน 200 ตัวอักษร'));
            return;
        }

        btnClosePicklistConfirm.disabled = true;
        showAlert('info', t('Closing picklist…', 'กำลังปิด Picklist…'));

        cpkPost('close_picklist.php', {
            PicklistID: selectedPicklistId,
            Operator: operator,
            KitsNote: kitsNote
        })
            .then(function (res) {
                btnClosePicklistConfirm.disabled = false;
                hideClosePicklistModal();

                var cpk = res.data || {};
                if (res.status !== 'success' || cpk.Status !== 'S' || !cpk.CloseDone) {
                    throw new Error(cpk.Message || res.message || t('Close failed.', 'ปิดไม่สำเร็จ'));
                }

                showAlert('success', t('Picklist closed: ', 'ปิด Picklist สำเร็จ: ') + selectedPicklistId);
                selectedPicklistId = '';
                issuePanel.hidden = true;
                loadOpenPicklists(true);
            })
            .catch(function (err) {
                btnClosePicklistConfirm.disabled = false;
                showAlert('error', err.message || t('Close failed.', 'ปิดไม่สำเร็จ'));
            });
    }

    btnClosePicklist.addEventListener('click', openClosePicklistModal);
    btnClosePicklistCancel.addEventListener('click', hideClosePicklistModal);
    btnClosePicklistConfirm.addEventListener('click', confirmClosePicklist);
    if (btnFifoRenewalOk) {
        btnFifoRenewalOk.addEventListener('click', closeFifoRenewalModal);
    }
    if (fifoRenewalModal) {
        fifoRenewalModal.addEventListener('click', function (e) {
            if (e.target === fifoRenewalModal) {
                closeFifoRenewalModal();
            }
        });
    }
    closePicklistModal.addEventListener('click', function (e) {
        if (e.target === closePicklistModal) {
            hideClosePicklistModal();
        }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && fifoRenewalModal && fifoRenewalModal.classList.contains('is-open')) {
            closeFifoRenewalModal();
        } else if (e.key === 'Escape' && closePicklistModal.classList.contains('is-open')) {
            hideClosePicklistModal();
        }
    });

    document.getElementById('requiredOnlyToggle')?.addEventListener('change', function () {
        requiredOnlyMode = !!this.checked;
        if (issuePanelActive()) {
            reloadSelectedPicklistDetail();
        }
    });
    document.getElementById('btnRefreshPicklists').addEventListener('click', function () {
        loadOpenPicklists(true);
    });
    document.getElementById('btnIssue').addEventListener('click', issuePuid);
    puidInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            issuePuid();
        }
    });
    puidInput.addEventListener('input', function () {
        this.value = normalizePuid(this.value);
    });

    if (typeof PicklistNotify !== 'undefined') {
        PicklistNotify.bindUnlock();
    }
    loadOpenPicklists(true);
    setInterval(pollOpenPicklists, 45000);
})();
</script>
<script src="assets/factory.js"></script>
</body>
</html>
