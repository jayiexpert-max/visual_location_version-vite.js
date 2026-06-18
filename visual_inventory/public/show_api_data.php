<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once("../config/language.php");

if (!role_can_receive_inbound()) {
    http_response_code(403);
    $isEN = (($_SESSION['lang'] ?? 'th') === 'en');
    echo $isEN ? 'Access denied.' : 'ไม่มีสิทธิ์เข้าถึง';
    exit;
}

$isEN = ($_SESSION['lang'] == 'en');

$page_title = $isEN ? 'Reservation Management' : 'จัดการใบจองสินค้า';
$page_icon = 'fa-file-invoice';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
    <link href="assets/factory.css?v=20260611" rel="stylesheet">
    <link href="assets/show-api-data.css?v=20260612" rel="stylesheet">
    <script>
        const isEN = <?= json_encode($isEN) ?>;
    </script>
</head>

<body class="factory-app factory-reservation">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<?php require __DIR__ . '/includes/layout_status_bar.php'; ?>
<main class="fx-main fx-main--flush">
    <div class="main-container">
        <!-- Left Panel: List -->
        <div class="left-panel">
            <div class="panel-header">
                <span><?= $isEN ? 'Reservation List & Search' : 'รายการใบจอง & ค้นหา' ?></span>
            </div>
            <div class="filter-section">
                <form id="newResForm" class="fx-scan-row" onsubmit="event.preventDefault(); searchNewRes();">
                    <input type="text" id="newResInput" class="fx-scan-input"
                        placeholder="<?= $isEN ? 'Scan or enter Res No...' : 'สแกนหรือใส่เลข RES...' ?>" autocomplete="off"
                        oninput="applyResInputNormalize(this)">
                    <button type="submit" class="fx-btn fx-btn-accent">
                        <i class="fas fa-search"></i> <?= $isEN ? 'Search' : 'ค้นหา' ?>
                    </button>
                </form>
            </div>
            <div class="list-container" id="resList">
                <!-- List items will be here -->
            </div>
        </div>

        <!-- Right Panel: Details -->
        <div class="right-panel" id="detailPanel">
            <div class="empty-state" id="detailEmptyState">
                <i class="fas fa-list"></i>
                <p><?= $isEN ? 'Open the reservation list on the left, or search a new Res No.' : 'เปิดรายการใบจองทางซ้าย หรือค้นหาเลข RES ใหม่' ?></p>
                <button type="button" class="fx-btn fx-btn-accent" id="btnShowResList">
                    <i class="fas fa-list-ul"></i> <?= $isEN ? 'List Res' : 'รายการใบจอง' ?>
                </button>
            </div>
        </div>
    </div>

    <script src="assets/form-busy.js"></script>
    <script>
        let allReservations = [];
        let activeResNo = null;

        function normalizeCpkList(value, mode) {
            if (value === null || value === undefined || value === '') return [];
            if (Array.isArray(value)) return value;
            if (typeof value !== 'object') return [];

            if (mode === 'item') {
                if (value.PartNumber || value.ItemNo || value.MatNumber) return [value];
                const itemKeys = ['Item', 'ReservationItem', 'Items', 'Material', 'Detail', 'Line'];
                for (let i = 0; i < itemKeys.length; i++) {
                    if (value[itemKeys[i]] !== undefined) return normalizeCpkList(value[itemKeys[i]], 'item');
                }
            } else {
                if (typeof value === 'string') return [{ PUID: value }];
                if (value.PUID && !Array.isArray(value.PUID) && (value.Received || value.BatchNumber)) return [value];
                if (Array.isArray(value.PUID)) return normalizeCpkList(value.PUID, 'puid');
                const puidKeys = ['ReservationPUID', 'PUIDItem', 'Item'];
                for (let i = 0; i < puidKeys.length; i++) {
                    if (value[puidKeys[i]] !== undefined) return normalizeCpkList(value[puidKeys[i]], 'puid');
                }
                if (value.PUID || value.Received || value.BatchNumber) return [value];
            }

            return Object.values(value).filter(function (row) {
                return row && typeof row === 'object';
            });
        }

        function normalizeResNo(value) {
            return String(value || '').trim().toUpperCase().replace(/^RES/i, '');
        }

        function applyResInputNormalize(input) {
            if (!input) return '';
            const normalized = normalizeResNo(input.value);
            if (input.value !== normalized) {
                input.value = normalized;
            }
            return normalized;
        }

        function focusPuidVerifyInput() {
            requestAnimationFrame(function () {
                const el = document.getElementById('puidVerifyInput');
                if (el && !el.disabled) {
                    el.focus();
                    el.select();
                }
            });
        }

        function normalizePuidEntry(row) {
            if (typeof row === 'string') return { PUID: row.trim() };
            if (!row || typeof row !== 'object') return { PUID: '' };
            if (!row.PUID && row.PublicUID) row.PUID = row.PublicUID;
            return row;
        }

        function normalizeResData(data) {
            const normalized = Object.assign({}, data);
            normalized.Items = normalizeCpkList(data && data.Items, 'item').map(function (item) {
                return Object.assign({}, item, {
                    PUIDList: normalizeCpkList(item.PUIDList, 'puid').map(normalizePuidEntry),
                });
            });
            return normalized;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function escapeAttr(value) {
            return escapeHtml(value).replace(/"/g, '&quot;');
        }

        function resNoKey(value) {
            return normalizeResNo(value);
        }

        function buildItemSummaryRows(items) {
            return items.map(function (item) {
                const puids = item.PUIDList || [];
                const receivedCount = puids.filter(isPuidReceived).length;
                return `
                    <tr>
                        <td>${escapeHtml(item.ItemNo || '-')}</td>
                        <td class="fx-res-part-name">${escapeHtml(item.PartNumber || '-')}</td>
                        <td>${escapeHtml(item.RequestQty ?? '-')}</td>
                        <td>${puids.length}</td>
                        <td>${receivedCount}</td>
                        <td>${puids.length ? Math.max(0, puids.length - receivedCount) : '-'}</td>
                    </tr>
                `;
            }).join('');
        }

        function isCpkReceivedFlag(value) {
            const v = String(value || '').toUpperCase().trim();
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

        function formatPuidQtyRemain(p, item) {
            if (p && p.QtyRemain !== undefined && p.QtyRemain !== null && p.QtyRemain !== '') {
                return escapeHtml(p.QtyRemain);
            }
            const fallback = item && (item.RequestQty ?? item.MatReqQty ?? item.ReqQty);
            if (fallback !== undefined && fallback !== null && fallback !== '') {
                return escapeHtml(fallback);
            }
            return '-';
        }

        function renderPuidStatusHtml(p) {
            if (isPuidReceived(p)) {
                let html = '<span class="fx-res-puid-status--received"><i class="fas fa-check-circle"></i> RECEIVED</span>';
                if (isPuidCpkReceived(p) && !isPuidLocallyReceived(p)) {
                    html += '<div class="fx-res-puid-status__hint">' +
                        (isEN ? 'CPK received — scan PUID below to save to warehouse' : 'CPK รับแล้ว — สแกน PUID ด้านล่างเพื่อบันทึกเข้าคลัง') +
                        '</div>';
                }
                return html;
            }
            return '<span class="fx-res-puid-status--pending"><i class="fas fa-clock"></i> PENDING</span>';
        }

        function showCpkWarningNotice(messages) {
            if (!messages || !messages.length) return;
            document.querySelectorAll('.cpk-warning-toast').forEach(function (el) { el.remove(); });
            const el = document.createElement('div');
            el.className = 'expired-puid-toast cpk-warning-toast show';
            el.setAttribute('role', 'alert');
            el.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <div>
                    <strong>${isEN ? 'Saved locally — CPK not synced' : 'บันทึกคลังแล้ว — ยังไม่ sync CPK'}</strong>
                    <p>${escapeHtml(messages.join(' '))}</p>
                </div>
            `;
            document.body.appendChild(el);
            setTimeout(function () {
                el.classList.remove('show');
                setTimeout(function () { el.remove(); }, 400);
            }, 10000);
        }

        function finishReceiveSuccess(inventoryData, options) {
            options = options || {};

            if (options.cpkWarnings && options.cpkWarnings.length) {
                showCpkWarningNotice(options.cpkWarnings);
            }

            // TV / 3D immediately — do not block next scan
            if (typeof highlightFromInventoryData === 'function' && !options.skipHighlight) {
                highlightFromInventoryData(inventoryData, 'receive_reservation');
            }

            markPuidReceivedInMemory(window._lastVerified && window._lastVerified.puid, inventoryData.QtyRemain, true);
            refreshResTablesOnly();
            resetPuidScanForNext();
            refreshList().catch(function () {});
        }

        function formatExpireDate(value) {
            if (!value) return '-';
            const raw = String(value);
            if (/^\d{8}$/.test(raw)) {
                return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
            }
            return raw;
        }

        function parseExpirationDate(value) {
            if (!value) return null;
            const raw = String(value).trim();
            if (/^\d{8}$/.test(raw)) {
                return new Date(parseInt(raw.slice(0, 4), 10), parseInt(raw.slice(4, 6), 10) - 1, parseInt(raw.slice(6, 8), 10));
            }
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d;
        }

        function isPuidExpired(expirationValue) {
            const exp = parseExpirationDate(expirationValue);
            if (!exp) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            exp.setHours(0, 0, 0, 0);
            return exp < today;
        }

        function expiredPuidBannerHtml(puid, expDate) {
            const expDisplay = formatExpireDate(expDate);
            return `
                <div class="fx-res-banner fx-res-banner--danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${isEN
                        ? `<strong>Expired PUID</strong> — PUID <b>${escapeHtml(puid)}</b> expired on ${escapeHtml(expDisplay)}. Send for shelf-life extension before use. You may still receive into warehouse.`
                        : `<strong>PUID หมดอายุ</strong> — PUID <b>${escapeHtml(puid)}</b> หมดอายุเมื่อ ${escapeHtml(expDisplay)} กรุณานำส่งต่ออายุก่อนนำไปใช้งาน — สามารถรับเข้าคลังได้ตามปกติ`}
                </div>
            `;
        }

        function showExpiredPuidNotice(puid, expDate) {
            document.querySelectorAll('.expired-puid-toast').forEach(function (el) { el.remove(); });

            const el = document.createElement('div');
            el.className = 'expired-puid-toast';
            el.setAttribute('role', 'alert');
            const expDisplay = formatExpireDate(expDate);
            el.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>${isEN ? 'Expired PUID — receive allowed' : 'PUID หมดอายุ — รับเข้าได้'}</strong>
                    <p>${isEN
                        ? `PUID <b>${escapeHtml(puid)}</b> is expired (${escapeHtml(expDisplay)}). Send for shelf-life extension before use. You may still receive into warehouse.`
                        : `PUID <b>${escapeHtml(puid)}</b> หมดอายุแล้ว (${escapeHtml(expDisplay)}) กรุณานำส่งต่ออายุก่อนนำไปใช้งาน — สามารถรับเข้าคลังได้ตามปกติ`}</p>
                </div>
            `;
            document.body.appendChild(el);
            requestAnimationFrame(function () { el.classList.add('show'); });
            setTimeout(function () {
                el.classList.remove('show');
                setTimeout(function () { el.remove(); }, 400);
            }, 7000);
        }

        function focusResListPanel() {
            const leftPanel = document.querySelector('.left-panel');
            if (leftPanel) {
                leftPanel.classList.add('is-list-focus');
                leftPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                window.setTimeout(function () {
                    leftPanel.classList.remove('is-list-focus');
                }, 1600);
            }
            const listEl = document.getElementById('resList');
            if (listEl) {
                listEl.scrollTop = 0;
            }
        }

        async function showResList() {
            await refreshList();
            focusResListPanel();
            const input = document.getElementById('newResInput');
            if (input) {
                input.focus();
            }
        }

        async function searchNewRes() {
            const input = document.getElementById('newResInput');
            const resNo = applyResInputNormalize(input);
            if (!resNo) {
                await showResList();
                return;
            }

            const panel = document.getElementById('detailPanel');
            panel.innerHTML = '<div class="loading-overlay"><i class="fas fa-spinner fa-spin"></i> Searching API...</div>';

            try {
                // Calling this API also logs it to our local reservation_list table
                const response = await fetch(`api_gateway.php?call=get_res_info.php&res_no=${encodeURIComponent(resNo)}`);
                const data = await response.json();

                if (data.status === 'success') {
                    await refreshList();
                    await selectRes((data.data && data.data.ReservationNo) || resNo);
                    input.value = '';
                    focusPuidVerifyInput();
                } else {
                    panel.innerHTML = `<div class="empty-state empty-state--error"><i class="fas fa-exclamation-circle"></i><p>${data.message}</p></div>`;
                }
            } catch (err) {
                panel.innerHTML = '<div class="empty-state">Error connecting to API</div>';
            }
        }

        async function refreshList() {
            const listEl = document.getElementById('resList');
            listEl.innerHTML = '<div class="loading-overlay"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
            
            try {
                const response = await fetch('api_gateway.php?call=get_reservation_list.php');
                const data = await response.json();
                
                if (data.status === 'success') {
                    allReservations = data.data;
                    renderList(allReservations);
                }
            } catch (err) {
                listEl.innerHTML = '<div class="empty-state">Error loading list</div>';
            }
        }

        function renderList(list) {
            const listEl = document.getElementById('resList');
            if (!listEl) return;
            if (list.length === 0) {
                listEl.innerHTML = '<div class="empty-state">' + (isEN ? 'No reservations found' : 'ไม่พบใบจอง') + '</div>';
                return;
            }

            const activeKey = resNoKey(activeResNo);
            listEl.innerHTML = list.map(function (item) {
                const resNo = String(item.res_no ?? '').trim();
                const isActive = resNoKey(resNo) === activeKey && activeKey !== '';
                const status = String(item.status || 'pending').toLowerCase();
                return (
                    '<div class="res-item' + (isActive ? ' active' : '') +
                    (item.status === 'Completed' ? ' completed' : '') +
                    '" data-res-no="' + escapeAttr(resNo) + '" role="button" tabindex="0">' +
                    '<div class="res-info">' +
                    '<div class="res-no">RES: ' + escapeHtml(resNo) + '</div>' +
                    '<div class="res-date">' + escapeHtml(new Date(item.req_date).toLocaleString()) + '</div>' +
                    '</div>' +
                    '<div class="res-item__actions">' +
                    '<span class="status-badge status-' + escapeAttr(status) + '">' +
                    escapeHtml(item.status || 'Pending') + '</span>' +
                    '</div>' +
                    '</div>'
                );
            }).join('');
        }

        function bindResListClicks() {
            const listEl = document.getElementById('resList');
            if (!listEl || listEl.dataset.bound === '1') {
                return;
            }
            listEl.dataset.bound = '1';
            listEl.addEventListener('click', function (event) {
                const row = event.target.closest('.res-item[data-res-no]');
                if (!row) return;
                const resNo = row.getAttribute('data-res-no') || '';
                if (resNo) {
                    selectRes(resNo);
                }
            });
            listEl.addEventListener('keydown', function (event) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                const row = event.target.closest('.res-item[data-res-no]');
                if (!row) return;
                event.preventDefault();
                const resNo = row.getAttribute('data-res-no') || '';
                if (resNo) {
                    selectRes(resNo);
                }
            });
        }

        function focusDetailPanel() {
            const panel = document.getElementById('detailPanel');
            if (!panel) return;
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        let currentResData = null;
        let verifiedPUIDs = new Set();

        function buildPuidDetailRows(items) {
            let rows = '';
            items.forEach(function (item) {
                const puids = item.PUIDList || [];
                if (puids.length === 0) {
                    rows += `
                        <tr>
                            <td>${escapeHtml(item.ItemNo || '-')}</td>
                            <td>
                                <div class="fx-res-part-name">${escapeHtml(item.PartNumber || '-')}</div>
                                <div class="fx-res-part-sub">No PUID assigned yet</div>
                            </td>
                            <td>${escapeHtml(item.RequestQty ?? '-')}</td>
                            <td>-</td>
                            <td>-</td>
                            <td><span class="fx-res-puid-status--pending"><i class="fas fa-clock"></i> AWAITING PUID</span></td>
                        </tr>
                    `;
                    return;
                }

                puids.forEach(function (p) {
                    const received = isPuidReceived(p);
                    rows += `
                        <tr class="${received ? 'fx-res-row-received' : ''}">
                            <td>${escapeHtml(item.ItemNo || '-')}</td>
                            <td>
                                <div class="fx-res-part-name">${escapeHtml(item.PartNumber || '-')}</div>
                                <div class="fx-res-part-sub">PUID: ${escapeHtml(p.PUID || '-')}</div>
                            </td>
                            <td>${escapeHtml(item.RequestQty ?? '-')}</td>
                            <td class="fx-res-qty-accent">${formatPuidQtyRemain(p, item)}</td>
                            <td>${escapeHtml(p.BatchNumber || '-')}</td>
                            <td>
                                ${renderPuidStatusHtml(p)}
                                <div class="fx-res-part-sub" style="margin-top:4px;">Exp: ${escapeHtml(formatExpireDate(p.ExpireDate))}</div>
                            </td>
                        </tr>
                    `;
                });
            });
            return rows;
        }

        function markPuidReceivedInMemory(puid, qtyRemain, localReceived) {
            if (!currentResData || !puid) return;
            const target = String(puid).toUpperCase();
            (currentResData.Items || []).forEach(function (item) {
                (item.PUIDList || []).forEach(function (p) {
                    if (String(p.PUID || '').toUpperCase() !== target) return;
                    p.cpk_received = true;
                    p.Received = 'Y';
                    p.is_received = true;
                    if (localReceived) {
                        p.is_already_in_db = true;
                    }
                    if (qtyRemain !== undefined && qtyRemain !== null) {
                        p.QtyRemain = qtyRemain;
                    }
                });
            });
        }

        function refreshResTablesOnly() {
            if (!currentResData) return;
            const items = currentResData.Items || [];
            const summaryBody = document.getElementById('resSummaryBody');
            const puidBody = document.getElementById('resPuidBody');
            if (summaryBody) {
                summaryBody.innerHTML = buildItemSummaryRows(items);
            }
            if (puidBody) {
                const rows = buildPuidDetailRows(items);
                puidBody.innerHTML = rows || `<tr><td colspan="6" class="fx-res-part-sub" style="text-align:center;">${isEN ? 'No PUID rows' : 'ไม่มี PUID'}</td></tr>`;
            }
        }

        async function selectRes(resNo) {
            resNo = normalizeResNo(resNo);
            if (!resNo) return;

            activeResNo = resNo;
            window._lastVerified = null;
            renderList(allReservations);

            const panel = document.getElementById('detailPanel');
            panel.innerHTML = '<div class="loading-overlay"><i class="fas fa-spinner fa-spin"></i> ' +
                (isEN ? 'Loading details...' : 'กำลังโหลดรายละเอียด...') + '</div>';
            focusDetailPanel();

            try {
                const response = await fetch('api_gateway.php?call=get_res_info.php&res_no=' + encodeURIComponent(resNo));
                const data = await response.json();

                if (data.status === 'success') {
                    currentResData = normalizeResData(data.data);
                    const resData = currentResData;
                    const items = resData.Items || [];
                    const totalPuids = items.reduce(function (sum, item) {
                        return sum + ((item.PUIDList && item.PUIDList.length) || 0);
                    }, 0);
                    const metaItems = (data.meta && data.meta.item_count) || items.length;
                    const metaPuids = (data.meta && data.meta.puid_count) || totalPuids;
                    const isCompleted = items.length > 0 && items.every(item => {
                        const puids = item.PUIDList || [];
                        if (puids.length === 0) return false;
                        return puids.every(isPuidLocallyReceived);
                    });
                    const rows = buildPuidDetailRows(items);

                    panel.innerHTML = `
                        <div class="detail-header">
                            <div>
                                <h3 class="${isCompleted ? 'is-completed' : 'is-pending'}">
                                    Res No. : ${resData.ReservationNo}
                                    ${isCompleted ? '<span class="status-badge status-completed" style="margin-left:15px; font-size: 1rem;">COMPLETED</span>' : ''}
                                </h3>
                                <div class="res-meta">
                                    <span><i class="far fa-calendar-alt"></i> Last Update: ${new Date().toLocaleString()}</span>
                                    <span><i class="fas fa-info-circle"></i> Status: ${isCompleted ? 'All items in warehouse' : 'Partial/Pending'}</span>
                                </div>
                            </div>
                            <div class="detail-header__actions">
                                ${!isCompleted ? `
                                    <a href="add_stock?res_no=${resData.ReservationNo}" class="btn-receive">
                                        <i class="fas fa-plus-circle"></i> <?= $isEN ? 'Receive More' : 'รับสินค้าเพิ่ม' ?>
                                    </a>
                                ` : ''}
                            </div>
                        </div>

                        <div class="verification-box" id="puidVerifyBox">
                            <h4>
                                <i class="fas fa-barcode"></i> ${isEN ? 'PUID Verification Scan' : 'สแกน PUID เพื่อตรวจสอบ'}
                            </h4>
                            <p class="verification-box__hint">
                                ${isEN ? 'Scan or enter PUID to verify against reservation data' : 'สแกนหรือระบุ PUID เพื่อตรวจสอบข้อมูลกับใบจอง'}
                            </p>
                            <div class="verify-input-group">
                                <input type="text" id="puidVerifyInput" class="fx-scan-input" placeholder="${isEN ? 'Scan PUID here...' : 'สแกน PUID ที่นี่...'}" onkeypress="handleVerifyEnter(event)">
                                <button type="button" class="fx-btn fx-btn-accent verify-btn" onclick="verifyPUID()">${isEN ? 'Verify' : 'ตรวจสอบ'}</button>
                            </div>

                            <div id="verifyDetails" class="verify-details"></div>

                            <div id="saveBtnSection" class="save-btn-section">
                                <button type="button" onclick="saveVerification()" class="btn-receive btn-receive--success">
                                    <i class="fas fa-save"></i> ${isEN ? 'Save to Warehouse' : 'บันทึกรับเข้าคลัง'}
                                </button>
                            </div>
                        </div>

                        <div class="table-container">
                            <h4>${isEN ? 'Item Summary (all parts in RES)' : 'สรุปรายการ Part ทั้งหมด'}</h4>
                            <div class="fx-table-wrap">
                            <table class="fx-table">
                                <thead>
                                    <tr>
                                        <th>Item#</th>
                                        <th>Part Number</th>
                                        <th>Request Qty</th>
                                        <th>PUID Count</th>
                                        <th>Received</th>
                                        <th>Pending</th>
                                    </tr>
                                </thead>
                                <tbody id="resSummaryBody">
                                    ${buildItemSummaryRows(items)}
                                </tbody>
                            </table>
                            </div>
                        </div>

                        <div class="table-container">
                            <h4>${isEN ? 'PUID Detail (all rolls/bins)' : 'รายละเอียด PUID ทั้งหมด'}</h4>
                            <div class="fx-table-wrap">
                            <table class="fx-table">
                                <thead>
                                    <tr>
                                        <th>Item#</th>
                                        <th>Part Number & PUID</th>
                                        <th>Request Qty</th>
                                        <th>Qty Remain</th>
                                        <th>Batch</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="resPuidBody">
                                    ${rows || `<tr><td colspan="6" class="fx-res-part-sub" style="text-align:center;">${isEN ? 'No PUID rows' : 'ไม่มี PUID'}</td></tr>`}
                                </tbody>
                            </table>
                            </div>
                            <p class="fx-table-footnote">
                                ${metaItems} ${isEN ? 'item line(s)' : 'รายการ Part'}, ${metaPuids} PUID(s) ${isEN ? 'from CPK API' : 'จาก CPK API'}.
                            </p>
                        </div>

                    `;
                    activeResNo = resNoKey(resData.ReservationNo || resNo);
                    renderList(allReservations);
                    focusDetailPanel();
                    focusPuidVerifyInput();
                } else {
                    panel.innerHTML =
                        '<div class="empty-state empty-state--error">' +
                        '<i class="fas fa-exclamation-circle"></i>' +
                        '<p>RES ' + escapeHtml(resNo) + ': ' + escapeHtml(data.message || (isEN ? 'Failed to load reservation' : 'โหลดใบจองไม่สำเร็จ')) + '</p>' +
                        '<button type="button" class="fx-btn fx-btn-secondary" id="btnShowResListRetry">' +
                        '<i class="fas fa-list-ul"></i> ' + (isEN ? 'Back to list' : 'กลับรายการ') +
                        '</button></div>';
                    document.getElementById('btnShowResListRetry')?.addEventListener('click', showResList);
                }
            } catch (err) {
                console.error(err);
                panel.innerHTML =
                    '<div class="empty-state empty-state--error">' +
                    '<i class="fas fa-exclamation-circle"></i>' +
                    '<p>' + (isEN ? 'Error loading details' : 'โหลดรายละเอียดไม่สำเร็จ') + '</p>' +
                    '<button type="button" class="fx-btn fx-btn-secondary" id="btnShowResListRetry">' +
                    '<i class="fas fa-list-ul"></i> ' + (isEN ? 'Back to list' : 'กลับรายการ') +
                    '</button></div>';
                document.getElementById('btnShowResListRetry')?.addEventListener('click', showResList);
            }
        }

        function handleVerifyEnter(e) {
            if (e.key === 'Enter') verifyPUID();
        }

        async function verifyPUID() {
            const input = document.getElementById('puidVerifyInput');
            let puid = input.value.trim().toUpperCase().replace(/^VL/, '');
            input.value = puid;

            if (!puid) return;
            if (!FormBusy.tryBegin('res:verify')) return;

            const verifyBtn = document.querySelector('.verify-btn');
            if (verifyBtn) {
                FormBusy.setButtons(true, [{ el: verifyBtn, busyHtml: '<i class="fas fa-spinner fa-spin"></i>' }]);
            }
            if (input) input.disabled = true;

            const detailsDiv = document.getElementById('verifyDetails');
            const box = document.getElementById('puidVerifyBox');
            detailsDiv.style.display = 'block';
            detailsDiv.innerHTML = '<div style="padding:10px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Fetching details...</div>';

            // Find in RES data
            let found = null;
            let targetItem = null;
            (currentResData.Items || []).forEach(item => {
                const p = (item.PUIDList || []).find(pl => String(pl.PUID || '').toUpperCase() === puid);
                if (p) {
                    found = p;
                    targetItem = item;
                }
            });

            if (found) {
                try {
                    // Fetch full metadata (same as add_stock)
                    const response = await fetch(`get_inventory_proxy.php?puid=${found.PUID}&hanapart=${targetItem.PartNumber}`);
                    const meta = await response.json();

                    if (meta.status === 'success') {
                        box.className = 'verification-box active';
                        const pdserviceOffline = !!meta.pdservice_offline;

                        // Use QtyRemain from Material API as the source of truth, 
                        // fallback to local DB check, then finally to Reservation Request Qty
                        let qtyDisplay = meta.data.QtyRemain;
                        if (qtyDisplay === undefined || qtyDisplay === null) {
                            qtyDisplay = (found.QtyRemain !== undefined && found.QtyRemain !== null) ? found.QtyRemain : targetItem.RequestQty;
                        }

                        const expValue = meta.data.ExpirationDate || found.ExpireDate || '';
                        const expired = isPuidExpired(expValue);
                        const expDisplay = formatExpireDate(expValue);
                        const expClass = expired ? 'fx-res-field__value--danger' : '';
                        
                        detailsDiv.innerHTML = `
                            <div class="fx-res-verify-card">
                                <div class="fx-res-verify-card__head">
                                    <div class="fx-res-verify-card__status"><i class="fas fa-check-circle"></i> VERIFIED MATCH</div>
                                    <div class="fx-res-verify-card__qty">
                                        <div class="fx-res-verify-card__qty-value">${qtyDisplay}</div>
                                        <div class="fx-res-verify-card__qty-label">Qty Remain</div>
                                    </div>
                                </div>

                                <div class="fx-res-field-grid">
                                    <div class="fx-res-field">
                                        <label>PUID</label>
                                        <div class="fx-res-field__value">${found.PUID}</div>
                                    </div>
                                    <div class="fx-res-field">
                                        <label>Hana Part Name</label>
                                        <div class="fx-res-field__value">${targetItem.PartNumber}</div>
                                    </div>
                                    <div class="fx-res-field">
                                        <label>Internal Material (IM)</label>
                                        <div class="fx-res-field__value">${meta.data.IM || '-'}</div>
                                    </div>
                                    <div class="fx-res-field">
                                        <label>Batch / Lot No</label>
                                        <div class="fx-res-field__value">${found.BatchNumber || '-'} / ${meta.data.LotNo || '-'}</div>
                                    </div>
                                    <div class="fx-res-field">
                                        <label>Customer</label>
                                        <div class="fx-res-field__value">${meta.data.Customer || '-'}</div>
                                    </div>
                                    <div class="fx-res-field">
                                        <label>Expiration Date</label>
                                        <div class="fx-res-field__value ${expClass}">${expDisplay}</div>
                                    </div>
                                    <div class="fx-res-field fx-res-location">
                                        <label>Target Storage Location</label>
                                        <div class="fx-res-location__value">
                                            <i class="fas fa-map-marker-alt"></i> ${meta.data.Loc_Shelf}-${meta.data.Loc_Level}-${meta.data.Loc_Box}${meta.data.Loc_Slot != null && meta.data.Loc_Slot !== '' ? ' (Slot ' + meta.data.Loc_Slot + ')' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        document.getElementById('saveBtnSection').style.display = 'block';
                        window._lastVerified = {
                            puid: found.PUID,
                            hanapart: targetItem.PartNumber,
                            meta: meta.data,
                            skip_cpk: isPuidCpkReceived(found),
                            is_expired: expired,
                            expiration: expValue,
                            pdservice_offline: pdserviceOffline,
                        };

                        if (pdserviceOffline) {
                            detailsDiv.innerHTML += `
                                <div class="fx-res-banner fx-res-banner--warning">
                                    <i class="fas fa-wifi"></i>
                                    ${meta.pdservice_warning || (isEN ? 'PDService offline — local warehouse data' : 'PDService ไม่ตอบ — ใช้ข้อมูลคลังในระบบ')}
                                </div>
                            `;
                        }

                        if (expired) {
                            showExpiredPuidNotice(found.PUID, expValue);
                            detailsDiv.innerHTML += expiredPuidBannerHtml(found.PUID, expValue);
                        }

                        if (isPuidCpkReceived(found) && !isPuidLocallyReceived(found)) {
                            detailsDiv.innerHTML += `
                                <div class="fx-res-banner fx-res-banner--warning">
                                    ${isEN
                                        ? 'This PUID is already received in CPK. Save to sync it into local warehouse stock.'
                                        : 'PUID นี้ CPK รับแล้ว กดบันทึกเพื่อ sync เข้าคลังในระบบ'}
                                </div>
                            `;
                        }
                    } else {
                        throw new Error(meta.message || (isEN ? 'Failed to load metadata' : 'โหลดข้อมูลไม่สำเร็จ'));
                    }
                } catch (err) {
                    detailsDiv.innerHTML = `<div class="empty-state--error" style="min-height:auto;padding:0.75rem 0;">❌ Error fetching metadata: ${err.message || err}</div>`;
                }
            } else {
                box.className = 'verification-box';
                detailsDiv.innerHTML = `
                    <div class="empty-state--error" style="min-height:auto;padding:0.75rem 0;text-align:left;">❌ PUID NOT FOUND IN THIS RESERVATION</div>
                    <p class="verification-box__hint" style="margin-top:0.25rem;">This PUID does not match any item in Res No. ${currentResData.ReservationNo}</p>
                `;
                document.getElementById('saveBtnSection').style.display = 'none';
                window._lastVerified = null;
            }
            FormBusy.end('res:verify');
            const verifyBtnDone = document.querySelector('.verify-btn');
            if (verifyBtnDone) {
                FormBusy.setButtons(false, [{ el: verifyBtnDone }]);
            }
            if (input) input.disabled = false;
        }

        function resetPuidScanForNext() {
            const input = document.getElementById('puidVerifyInput');
            const detailsDiv = document.getElementById('verifyDetails');
            const box = document.getElementById('puidVerifyBox');
            const saveBtnSection = document.getElementById('saveBtnSection');
            const saveBtn = saveBtnSection ? saveBtnSection.querySelector('button') : null;

            if (input) {
                input.value = '';
                input.focus();
            }
            if (detailsDiv) {
                detailsDiv.style.display = 'none';
                detailsDiv.innerHTML = '';
            }
            if (box) {
                box.className = 'verification-box';
            }
            if (saveBtnSection) {
                saveBtnSection.style.display = 'none';
            }
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.style.background = '';
                saveBtn.innerHTML = `<i class="fas fa-save"></i> ${isEN ? 'Save to Warehouse' : 'บันทึกรับเข้าคลัง'}`;
            }
            window._lastVerified = null;
        }

        async function saveVerification() {
            if (!window._lastVerified) return;
            if (!FormBusy.tryBegin('res:save')) return;
            
            const saveBtn = document.querySelector('#saveBtnSection button');
            const originalText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            try {
                let inventoryData = window._lastVerified.meta;

                // Reuse PDService data from verify step (avoid duplicate slow API call)
                if (!inventoryData || !inventoryData.slot_id) {
                    const response = await fetch(`get_inventory_proxy.php?puid=${encodeURIComponent(window._lastVerified.puid)}&hanapart=${encodeURIComponent(window._lastVerified.hanapart)}`);
                    const data = await response.json();
                    if (data.status !== 'success') {
                        alert('Could not determine storage location: ' + data.message);
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = originalText;
                        return;
                    }
                    inventoryData = data.data;
                    window._lastVerified.meta = inventoryData;
                }

                inventoryData.ReservationNo = currentResData.ReservationNo;
                inventoryData.PUID = window._lastVerified.puid;

                const receiveResponse = await fetch('api_gateway.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        call: 'receive_item.php',
                        ...inventoryData,
                        skip_cpk: !!window._lastVerified.skip_cpk,
                    })
                });
                const receiveResult = await receiveResponse.json();

                if (receiveResult.status === 'success') {
                    finishReceiveSuccess(inventoryData, {
                        cpkWarnings: receiveResult.cpk_warnings || null,
                    });
                } else {
                    alert('Error receiving item: ' + receiveResult.message);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                }
            } catch (err) {
                console.error(err);
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            } finally {
                FormBusy.end('res:save');
            }
        }

        window.selectRes = selectRes;
        window.verifyPUID = verifyPUID;
        window.saveVerification = saveVerification;
        window.handleVerifyEnter = handleVerifyEnter;

        // Init — RES input: strip "RES" prefix when scanning (paste + typing)
        (function () {
            bindResListClicks();
            const resInput = document.getElementById('newResInput');
            if (resInput) {
                resInput.addEventListener('paste', function () {
                    setTimeout(function () { applyResInputNormalize(resInput); }, 0);
                });
            }
            document.getElementById('btnShowResList')?.addEventListener('click', function () {
                showResList();
            });
        })();

        (async function initResPage() {
            await refreshList();
            const params = new URLSearchParams(window.location.search);
            if (params.get('list') === '1' || params.get('view') === 'list') {
                focusResListPanel();
            }
            const resNo = normalizeResNo(params.get('res_no') || '');
            if (resNo) {
                await selectRes(resNo);
            }
        })();
    </script>
    <script src="assets/warehouse-highlight.js"></script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>