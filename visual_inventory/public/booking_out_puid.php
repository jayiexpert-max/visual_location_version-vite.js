<?php
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/session_check.php';

if (!role_is_warehouse_staff()) {
    $msg = __('logout') === 'Logout' ? 'Access denied' : 'ไม่มีสิทธิเข้าถึงหน้านี้';
    echo "<script>alert(" . json_encode($msg) . "); window.location.href='index';</script>";
    exit;
}

$isEN = ($_SESSION['lang'] ?? 'th') === 'en';
$page_title = $isEN ? 'Booking Out PUID' : 'ส่ง PUID ออกจาก Local Stock';
$page_icon = 'fa-dolly';
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
    <link href="assets/factory.css?v=20260611" rel="stylesheet">
    <link href="assets/booking-out-puid.css?v=20260607" rel="stylesheet">
</head>

<body class="factory-app factory-scan-page">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<?php require __DIR__ . '/includes/layout_status_bar.php'; ?>

<main class="fx-main fx-main--narrow">
    <div id="bookingAlert" class="fx-alert fx-alert-info" role="status">
        <?= $isEN
            ? 'Scan PUID, press Enter to load preview, verify, then choose STORE/OTHER and send.'
            : 'สแกน PUID กด Enter โหลดข้อมูลตรวจสอบ แล้วเลือก STORE/OTHER และส่งออก' ?>
    </div>

    <section class="fx-panel">
        <p class="fx-panel__title">
            <i class="fas fa-dolly"></i>
            <?= $isEN ? 'Send PUID out from Local Stock' : 'ส่ง PUID ออกจาก Local Stock' ?>
        </p>
        <p class="fx-panel__hint">
            <?= $isEN
                ? 'CPK BookingOutPUID — like WinApp Return To Store / Other SLOC. Only PUID in this station local stock. Does not change SAP Amount/Used/Correction.'
                : 'CPK BookingOutPUID — เหมือน WinApp ส่งคืนคลัง / SLOC อื่น ใช้ได้เฉพาะ PUID ใน Local Stock ของสถานี ไม่แก้ SAP Amount/Used/Correction' ?>
        </p>

        <label for="puidInput" class="fx-field-label">PUID</label>
        <div class="fx-scan-row fx-booking-scan-row">
            <input type="text" class="fx-scan-input" id="puidInput"
                placeholder="<?= $isEN ? 'Scan PUID then Enter to load preview' : 'สแกน PUID แล้วกด Enter เพื่อโหลดข้อมูล' ?>"
                autocomplete="off" maxlength="64">
            <button type="button" class="fx-btn fx-btn-accent" id="btnLoadPreview">
                <i class="fas fa-search"></i>
                <?= $isEN ? 'Load' : 'โหลด' ?>
            </button>
        </div>

        <div id="puidPreview" class="fx-booking-preview is-loading" hidden>
            <h4 id="puidPreviewTitle"><?= $isEN ? 'PUID preview' : 'ข้อมูล PUID' ?></h4>
            <div id="puidPreviewBody"><?= $isEN ? 'Scan PUID to verify before booking out.' : 'สแกน PUID เพื่อตรวจสอบก่อนส่งออก' ?></div>
        </div>

        <p class="fx-section-label"><?= $isEN ? 'Destination' : 'ปลายทาง' ?></p>
        <div class="fx-booking-dest" role="radiogroup" aria-label="<?= $isEN ? 'Destination' : 'ปลายทาง' ?>">
            <label>
                <input type="radio" name="destination" value="STORE" checked>
                <span><i class="fas fa-warehouse"></i> STORE</span>
            </label>
            <label>
                <input type="radio" name="destination" value="OTHER">
                <span><i class="fas fa-truck"></i> OTHER</span>
            </label>
        </div>

        <p class="fx-booking-operator">
            <?= $isEN ? 'Operator' : 'ผู้ดำเนินการ' ?>: <strong><?= $operator ?></strong>
        </p>

        <button type="button" class="fx-btn fx-btn-primary fx-btn-lg" id="btnBookingOut" disabled>
            <i class="fas fa-paper-plane"></i>
            <?= $isEN ? 'Booking out' : 'ส่งออก' ?>
        </button>
        <p id="bookingOutHint" class="fx-booking-hint">
            <?= $isEN ? 'Load PUID preview first, then choose destination and send.' : 'โหลดข้อมูล PUID ก่อน แล้วเลือกปลายทางและกดส่งออก' ?>
        </p>

        <div id="bookingResult" class="fx-booking-result" hidden></div>
    </section>
</main>

<div class="fx-booking-modal" id="bookingConfirmModal" role="dialog" aria-modal="true" hidden>
    <div class="fx-booking-dialog">
        <h3>
            <i class="fas fa-exclamation-triangle fx-booking-dialog__warn"></i>
            <?= $isEN ? 'Confirm booking out' : 'ยืนยันการส่งออก' ?>
        </h3>
        <p id="bookingConfirmMessage">—</p>
        <div class="fx-booking-actions">
            <button type="button" class="fx-btn fx-btn-secondary" id="btnBookingCancel">
                <?= $isEN ? 'Cancel' : 'ยกเลิก' ?>
            </button>
            <button type="button" class="fx-btn fx-btn-primary" id="btnBookingConfirm">
                <i class="fas fa-check"></i>
                <?= $isEN ? 'Confirm' : 'ยืนยัน' ?>
            </button>
        </div>
    </div>
</div>

<?php require __DIR__ . '/includes/layout_footer.php'; ?>

<script>
(function () {
    var isEN = <?= $isEN ? 'true' : 'false' ?>;
    var operator = <?= json_encode($_SESSION['username'] ?? '') ?>;
    var alertEl = document.getElementById('bookingAlert');
    var puidInput = document.getElementById('puidInput');
    var bookingResult = document.getElementById('bookingResult');
    var confirmModal = document.getElementById('bookingConfirmModal');
    var confirmMessage = document.getElementById('bookingConfirmMessage');
    var puidPreview = document.getElementById('puidPreview');
    var puidPreviewBody = document.getElementById('puidPreviewBody');
    var btnBookingOut = document.getElementById('btnBookingOut');
    var previewLoadedPuid = '';
    var previewData = null;
    var previewLoading = false;
    var alertTimer = null;
    var successReloadTimer = null;
    var idleAlertText = isEN
        ? 'Scan PUID, press Enter to load preview, verify, then choose STORE/OTHER and send.'
        : 'สแกน PUID กด Enter โหลดข้อมูลตรวจสอบ แล้วเลือก STORE/OTHER และส่งออก';

    function t(en, th) { return isEN ? en : th; }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    function normalizePuid(value) {
        return String(value || '').trim().toUpperCase().replace(/^VL/, '');
    }

    function validateRealPuid(puid) {
        puid = normalizePuid(puid);
        if (!puid) {
            return t('PUID is required.', 'กรุณาระบุ PUID');
        }
        if (puid.length > 64) {
            return t('PUID must be at most 64 characters.', 'PUID ต้องไม่เกิน 64 ตัวอักษร');
        }
        if (/DUMMYBATCH|MAT_DOC/i.test(puid)) {
            return t('Real PUID only (no DUMMYBATCH / MAT_DOC).', 'ต้องเป็น PUID จริงเท่านั้น');
        }
        return null;
    }

    function getDestination() {
        var checked = document.querySelector('input[name="destination"]:checked');
        return checked ? String(checked.value).toUpperCase() : 'STORE';
    }

    function hideAlert() {
        if (alertTimer) {
            clearTimeout(alertTimer);
            alertTimer = null;
        }
        alertEl.hidden = true;
    }

    function showIdleHint() {
        hideAlert();
        alertEl.hidden = false;
        alertEl.className = 'fx-alert fx-alert-info';
        alertEl.textContent = idleAlertText;
    }

    function showAlert(type, message, autoHideMs) {
        if (autoHideMs === undefined || autoHideMs === null) {
            if (type === 'error') {
                autoHideMs = 8000;
            } else if (type === 'info') {
                autoHideMs = 0;
            } else {
                autoHideMs = 5000;
            }
        }
        if (alertTimer) {
            clearTimeout(alertTimer);
            alertTimer = null;
        }
        alertEl.hidden = false;
        alertEl.className = 'fx-alert fx-alert-' + type;
        alertEl.textContent = message;
        if (autoHideMs > 0) {
            alertTimer = setTimeout(function () {
                alertTimer = null;
                showIdleHint();
            }, autoHideMs);
        }
    }

    function scheduleSuccessReload(ms) {
        if (successReloadTimer) {
            clearTimeout(successReloadTimer);
        }
        successReloadTimer = setTimeout(function () {
            successReloadTimer = null;
            window.location.reload();
        }, ms);
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
                    throw new Error(t('Invalid API response', 'ตอบกลับ API ไม่ถูกต้อง'));
                }
                if (!r.ok && (!data || !data.message)) {
                    throw new Error((data && data.message) || ('HTTP ' + r.status));
                }
                return data;
            });
        });
    }

    function formatBookingStatusValue(value) {
        if (value === null || value === undefined || value === '') {
            return '';
        }
        return String(value);
    }

    function formatPuidInfo(info) {
        if (!info || typeof info !== 'object') {
            return '';
        }
        var lines = [];
        if (info.PUID) {
            lines.push('PUID: <b>' + escapeHtml(info.PUID) + '</b>');
        }
        if (info.PartNumber) {
            lines.push(t('Part', 'พาร์ท') + ': <b>' + escapeHtml(info.PartNumber) + '</b>');
        }
        if (info.BatchNumber) {
            lines.push('Batch: <b>' + escapeHtml(info.BatchNumber) + '</b>');
        }
        if (info.Destination) {
            lines.push(t('Destination', 'ปลายทาง') + ': <b>' + escapeHtml(info.Destination) + '</b>');
        }
        if (info.Quantity != null) {
            lines.push(t('Quantity', 'จำนวน') + ': <b>' + escapeHtml(info.Quantity) + '</b>');
        }
        if (info.OldMcID != null || info.NewMcID != null) {
            lines.push('McID: <b>' + escapeHtml(info.OldMcID) + '</b> → <b>' + escapeHtml(info.NewMcID) + '</b>');
        }
        var oldStatus = formatBookingStatusValue(info.OldStatus);
        var newStatus = formatBookingStatusValue(info.NewStatus);
        if (oldStatus) {
            lines.push(t('Old status', 'สถานะเดิม') + ': <b>' + escapeHtml(oldStatus) + '</b>');
        }
        if (newStatus) {
            lines.push(t('New status', 'สถานะใหม่') + ': <b>' + escapeHtml(newStatus) + '</b>');
        }
        if (info.Correction != null) {
            lines.push('Correction: <b>' + escapeHtml(info.Correction) + '</b>');
        }
        return lines.join('<br>');
    }

    function fieldOrDash(value) {
        if (value === null || value === undefined || value === '') {
            return '—';
        }
        return escapeHtml(value);
    }

    function getBookingEligibility(data) {
        if (!data || !data.booking_eligibility) {
            return { eligible: true, blockers: [] };
        }
        var dest = getDestination();
        var row = data.booking_eligibility[dest] || data.booking_eligibility.STORE || {};
        var blockers = isEN ? (row.blockers || []) : (row.blockers_th || row.blockers || []);
        return {
            eligible: !!row.eligible,
            blockers: blockers
        };
    }

    function applyBookingEligibilityUi(data) {
        var elig = getBookingEligibility(data);
        btnBookingOut.disabled = !elig.eligible;
        return elig;
    }

    function renderPreviewPanel(data) {
        var sources = (data.preview_sources || []).join(', ');
        var elig = getBookingEligibility(data);
        var html = '';
        if (!elig.eligible && elig.blockers.length) {
            html += '<div class="fx-booking-blockers"><strong>' +
                t('Pre-check (before CPK):', 'ตรวจล่วงหน้า (ก่อนเรียก CPK):') + '</strong><ul>';
            elig.blockers.forEach(function (msg) {
                html += '<li>' + escapeHtml(msg) + '</li>';
            });
            html += '</ul><p class="fx-booking-blockers-note">' +
                t('These follow CPK/WinApp rules. CPK may still return its own Message on submit.',
                    'ข้อความตามกฎ CPK/WinApp — เมื่อกดส่งออก CPK อาจตอบ Message ของตัวเองเพิ่มเติม') +
                '</p></div>';
        }
        html += '<dl class="fx-booking-preview-grid">';
        html += '<dt>PUID</dt><dd><strong>' + fieldOrDash(data.PUID) + '</strong></dd>';
        html += '<dt>' + t('Part', 'พาร์ท') + '</dt><dd><strong>' + fieldOrDash(data.HanaPart) + '</strong></dd>';
        html += '<dt>IM</dt><dd>' + fieldOrDash(data.IM) + '</dd>';
        html += '<dt>' + t('Description', 'รายละเอียด') + '</dt><dd>' + fieldOrDash(data.Description) + '</dd>';
        html += '<dt>' + t('Qty remain', 'คงเหลือ') + '</dt><dd><strong>' + fieldOrDash(data.QtyRemain) + '</strong></dd>';
        html += '<dt>' + t('Full qty', 'บรรจุเต็ม') + '</dt><dd>' + fieldOrDash(data.Qty) + '</dd>';
        html += '<dt>Lot</dt><dd>' + fieldOrDash(data.LotNo) + '</dd>';
        html += '<dt>' + t('Expire', 'หมดอายุ') + '</dt><dd>' + fieldOrDash(data.ExpirationDate) + '</dd>';
        html += '<dt>McID</dt><dd>' + fieldOrDash(data.McID) + '</dd>';
        html += '<dt>' + t('Status', 'สถานะ') + '</dt><dd>' + fieldOrDash(data.StatusName) + '</dd>';
        html += '<dt>' + t('Location', 'ตำแหน่ง') + '</dt><dd>' + fieldOrDash(data.Location) + '</dd>';
        if (data.cpk_effective_remain != null) {
            html += '<dt>CPK ' + t('remain', 'คงเหลือ') + '</dt><dd>' + fieldOrDash(data.cpk_effective_remain) + '</dd>';
        }
        if (data.QtyRemain_pdservice_raw != null && data.QtyRemain_pdservice_raw < 0) {
            html += '<dt>PDService raw</dt><dd style="color:#b45309;">' + fieldOrDash(data.QtyRemain_pdservice_raw) + ' (Correction)</dd>';
        }
        html += '<dt>' + t('Sources', 'แหล่งข้อมูล') + '</dt><dd><small>' + fieldOrDash(sources) + '</small></dd>';
        html += '</dl>';
        return html;
    }

    function previewSummaryHtml(data) {
        if (!data) {
            return '';
        }
        return '<br><small>' +
            t('Part', 'พาร์ท') + ': <b>' + fieldOrDash(data.HanaPart) + '</b> · ' +
            t('Remain', 'คงเหลือ') + ': <b>' + fieldOrDash(data.QtyRemain) + '</b> · ' +
            'McID: <b>' + fieldOrDash(data.McID) + '</b>' +
            '</small>';
    }

    function clearPreview() {
        previewLoadedPuid = '';
        previewData = null;
        btnBookingOut.disabled = true;
        puidPreview.hidden = true;
        puidPreview.className = 'fx-booking-preview is-loading';
    }

    function setPreviewLoading() {
        puidPreview.hidden = false;
        puidPreview.className = 'fx-booking-preview is-loading';
        puidPreviewBody.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' +
            t('Loading PUID data…', 'กำลังโหลดข้อมูล PUID…');
        btnBookingOut.disabled = true;
    }

    function loadPuidPreview() {
        var puid = normalizePuid(puidInput.value);
        puidInput.value = puid;
        var err = validateRealPuid(puid);
        if (err) {
            showAlert('warning', err);
            clearPreview();
            puidPreview.hidden = false;
            puidPreview.className = 'fx-booking-preview is-error';
            puidPreviewBody.textContent = err;
            return Promise.resolve();
        }
        if (previewLoading) {
            return Promise.resolve();
        }
        previewLoading = true;
        var btnLoadPreview = document.getElementById('btnLoadPreview');
        if (btnLoadPreview) btnLoadPreview.disabled = true;
        setPreviewLoading();

        return fetch('booking_out_preview.php?puid=' + encodeURIComponent(puid), { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (json) {
                previewLoading = false;
                if (btnLoadPreview) btnLoadPreview.disabled = false;
                if (json.status !== 'success' || !json.data) {
                    previewLoadedPuid = '';
                    previewData = null;
                    btnBookingOut.disabled = true;
                    puidPreview.className = 'fx-booking-preview is-error';
                    puidPreviewBody.textContent = json.message || t('PUID not found.', 'ไม่พบ PUID');
                    showAlert('warning', json.message || t('PUID not found.', 'ไม่พบ PUID'));
                    return;
                }
                previewLoadedPuid = puid;
                previewData = json.data;
                var elig = applyBookingEligibilityUi(json.data);
                puidPreview.className = 'fx-booking-preview' + (elig.eligible ? '' : ' is-blocked');
                puidPreviewBody.innerHTML = renderPreviewPanel(json.data);
                if (elig.eligible) {
                    showAlert('success', t('PUID loaded — verify then choose destination.', 'โหลด PUID แล้ว — ตรวจสอบและเลือกปลายทาง'), 4000);
                } else {
                    showAlert('warning', elig.blockers[0] || t('PUID cannot be booked out.', 'PUID นี้ส่งออกไม่ได้'), 6000);
                }
            })
            .catch(function (err) {
                previewLoading = false;
                if (btnLoadPreview) btnLoadPreview.disabled = false;
                clearPreview();
                puidPreview.hidden = false;
                puidPreview.className = 'fx-booking-preview is-error';
                puidPreviewBody.textContent = err.message || t('Load failed.', 'โหลดไม่สำเร็จ');
                showAlert('error', err.message || t('Load failed.', 'โหลดไม่สำเร็จ'), 8000);
            });
    }

    function showResult(cpk, raw) {
        bookingResult.hidden = false;
        var status = String(cpk.Status || (raw && raw.status === 'success' ? 'S' : 'E')).toUpperCase();
        var isSuccess = status === 'S' && !!cpk.BookingOutDone;
        var badgeClass = status === 'S' ? 'is-s' : 'is-e';
        bookingResult.className = 'fx-booking-result' + (isSuccess ? ' is-success' : ' is-error');

        var html = '<div class="fx-booking-result-head"><span class="fx-booking-status-badge ' + badgeClass + '">' +
            escapeHtml(status) + '</span> <strong>' + escapeHtml(cpk.Message || (raw && raw.message) || '') + '</strong></div>';

        if (isSuccess) {
            html += '<div class="fx-booking-result-success-msg">' +
                '<i class="fas fa-check-circle fx-booking-result-icon--ok"></i> ' +
                t('Booking out completed successfully.', 'ส่งออกสำเร็จ') + '</div>';
            if (cpk.PUIDInfo) {
                html += '<div class="fx-booking-result-detail">' + formatPuidInfo(cpk.PUIDInfo) + '</div>';
            }
            if (cpk.Request && cpk.Request.Operator) {
                html += '<p style="margin:0.65rem 0 0;font-size:0.85rem;color:#64748b;">' +
                    t('Operator', 'ผู้ดำเนินการ') + ': <strong>' + escapeHtml(cpk.Request.Operator) + '</strong></p>';
            }
        } else {
            if (cpk.PUIDInfo) {
                html += '<div class="fx-booking-result-detail">' + formatPuidInfo(cpk.PUIDInfo) + '</div>';
            }
            if (cpk.Status || cpk.Request) {
                html += '<details style="margin-top:0.75rem;"><summary style="cursor:pointer;font-size:0.82rem;color:#64748b;">' +
                    t('Technical response (IT)', 'ข้อมูล technical (IT)') + '</summary><pre>' +
                    escapeHtml(JSON.stringify(cpk, null, 2)) + '</pre></details>';
            }
        }

        bookingResult.innerHTML = html;
    }

    function openConfirmModal() {
        var puid = normalizePuid(puidInput.value);
        var dest = getDestination();
        var err = validateRealPuid(puid);
        if (err) {
            showAlert('warning', err);
            puidInput.focus();
            return;
        }
        if (previewLoadedPuid !== puid || !previewData) {
            showAlert('warning', t('Load PUID preview first (Enter or Load).', 'โหลดข้อมูล PUID ก่อน (Enter หรือกดโหลด)'));
            loadPuidPreview();
            return;
        }
        var elig = getBookingEligibility(previewData);
        if (!elig.eligible) {
            showAlert('warning', elig.blockers[0] || t('PUID cannot be booked out.', 'PUID นี้ส่งออกไม่ได้'));
            return;
        }
        confirmMessage.innerHTML = t(
            'Send PUID <b>' + escapeHtml(puid) + '</b> to <b>' + escapeHtml(dest) + '</b> via CPK BookingOutPUID?<br>Operator: <b>' + escapeHtml(operator) + '</b>',
            'ส่ง PUID <b>' + escapeHtml(puid) + '</b> ไป <b>' + escapeHtml(dest) + '</b> ผ่าน CPK BookingOutPUID?<br>ผู้ดำเนินการ: <b>' + escapeHtml(operator) + '</b>'
        ) + previewSummaryHtml(previewData);
        confirmModal.hidden = false;
        confirmModal.classList.add('is-open');
    }

    function hideConfirmModal() {
        confirmModal.classList.remove('is-open');
        confirmModal.hidden = true;
    }

    function submitBookingOut() {
        var puid = normalizePuid(puidInput.value);
        var dest = getDestination();
        var err = validateRealPuid(puid);
        if (err) {
            showAlert('warning', err);
            hideConfirmModal();
            return;
        }

        document.getElementById('btnBookingConfirm').disabled = true;
        showAlert('info', t('Sending to CPK…', 'กำลังส่งไป CPK…'));

        cpkPost('booking_out_puid.php', {
            PUID: puid,
            Operator: operator,
            Destination: dest
        })
            .then(function (res) {
                document.getElementById('btnBookingConfirm').disabled = false;
                hideConfirmModal();
                hideAlert();
                var cpk = res.data || {};
                if (res.status !== 'success' || cpk.Status !== 'S' || !cpk.BookingOutDone) {
                    showResult(cpk, res);
                    throw new Error(res.message || cpk.Message || t('Booking out failed.', 'ส่งออกไม่สำเร็จ'));
                }
                showResult(cpk, res);
                showAlert('success', t('Booking out OK — refreshing…', 'ส่งออกสำเร็จ — กำลังรีเฟรช…'), 1800);
                scheduleSuccessReload(2000);
            })
            .catch(function (err) {
                document.getElementById('btnBookingConfirm').disabled = false;
                hideConfirmModal();
                showAlert('error', err.message || t('Booking out failed.', 'ส่งออกไม่สำเร็จ'), 8000);
            });
    }

    document.getElementById('btnBookingOut').addEventListener('click', openConfirmModal);
    document.getElementById('btnLoadPreview').addEventListener('click', loadPuidPreview);
    document.getElementById('btnBookingCancel').addEventListener('click', hideConfirmModal);
    document.getElementById('btnBookingConfirm').addEventListener('click', submitBookingOut);
    confirmModal.addEventListener('click', function (e) {
        if (e.target === confirmModal) {
            hideConfirmModal();
        }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && confirmModal.classList.contains('is-open')) {
            hideConfirmModal();
        }
        if (e.key === 'Enter' && document.activeElement === puidInput) {
            e.preventDefault();
            loadPuidPreview();
        }
    });
    document.querySelectorAll('input[name="destination"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            if (!previewData) {
                return;
            }
            var elig = applyBookingEligibilityUi(previewData);
            puidPreview.className = 'fx-booking-preview' + (elig.eligible ? '' : ' is-blocked');
            puidPreviewBody.innerHTML = renderPreviewPanel(previewData);
        });
    });
    puidInput.addEventListener('input', function () {
        this.value = normalizePuid(this.value);
        if (previewLoadedPuid && normalizePuid(this.value) !== previewLoadedPuid) {
            clearPreview();
            puidPreview.hidden = false;
            puidPreview.className = 'fx-booking-preview is-loading';
            puidPreviewBody.textContent = t('PUID changed — press Enter or Load to refresh.', 'PUID เปลี่ยน — กด Enter หรือโหลดใหม่');
        }
    });
    puidInput.focus();
})();
</script>
<script src="assets/factory.js"></script>
</body>
</html>
