<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once("../config/helpers.php");
require_once("../config/expiry_group_service.php");

if (!role_is_warehouse_staff()) {
    $isEN = (($_SESSION['lang'] ?? 'th') === 'en');
    $msg = $isEN ? 'Access denied' : 'ไม่มีสิทธิเข้าถึงหน้านี้';
    echo "<script>alert(" . json_encode($msg) . "); window.location.href='index';</script>";
    exit;
}

// Pagination settings
$limit = 20;
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$start = ($page - 1) * $limit;

$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$res_no = isset($_GET['res_no']) ? normalize_res_no_input($_GET['res_no']) : '';
$status_filter = isset($_GET['status']) ? $_GET['status'] : 'all';
$isEN = (($_SESSION['lang'] ?? 'th') === 'en');

$res_no_options = [];
$resListSql = "SELECT res_no FROM (
        SELECT DISTINCT ReservationNo AS res_no FROM inventory_receive
        WHERE ReservationNo IS NOT NULL AND ReservationNo <> '' AND QtyRemain > 0
        UNION
        SELECT res_no FROM reservation_list WHERE res_no IS NOT NULL AND res_no <> ''
    ) t ORDER BY res_no DESC LIMIT 300";
$resListRes = $condb->query($resListSql);
if ($resListRes) {
    while ($r = $resListRes->fetch_assoc()) {
        $res_no_options[] = $r['res_no'];
    }
}

// Sync from central system: manual button only (via sync_station_inventory.php API)
$whereArr = ["QtyRemain > 0"]; // Only show items currently in stock

if ($search) {
    $searchTerm = "%$search%";
    $whereArr[] = "(HanaPart LIKE '$searchTerm' OR IM LIKE '$searchTerm' OR PUID LIKE '$searchTerm')";
}

if ($res_no !== '') {
    $resEsc = $condb->real_escape_string($res_no);
    $whereArr[] = "ReservationNo = '$resEsc'";
}

// Status Filter Logic using ExpirationDate
if ($status_filter === 'expired') {
    $whereArr[] = "ExpirationDate < CURDATE()";
} elseif ($status_filter === 'soon') {
    $whereArr[] = "ExpirationDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)";
} elseif ($status_filter === 'normal') {
    $whereArr[] = "ExpirationDate > DATE_ADD(CURDATE(), INTERVAL 7 DAY)";
} elseif ($status_filter === 'all_stock') {
    // No extra date filter, show everything in stock
} else {
    // Default: Show only Expired + Soon (within 7 days)
    $whereArr[] = "ExpirationDate <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)";
}

$whereStr = "WHERE " . implode(" AND ", $whereArr);

// ---- Export Excel (CSV) ----
if (isset($_GET['export']) && $_GET['export'] === 'excel') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=Expiration_Report_' . date('Y-m-d') . '.csv');
    $output = fopen('php://output', 'w');

    // Add BOM for Excel UTF-8 compatibility
    fputs($output, "\xEF\xBB\xBF");

    // Headers (grouped by HanaPart + IM — same as email report)
    fputcsv($output, [
        'HanaPart',
        'IM',
        'PUID Count',
        'Lot Number(s)',
        'Total Qty',
        'ExpirationDate',
        'DaysLeft',
        'Status',
    ]);

    $exportRows = expiry_fetch_grouped($condb, $whereStr);
    $today = date('Y-m-d');

    foreach ($exportRows as $row) {
        $expDate = $row['ExpirationDate'] ?? null;
        $status = expiry_status_meta($expDate, true, $today);

        fputcsv($output, [
            $row['HanaPart'],
            $row['IM'],
            (int) $row['puid_count'],
            expiry_format_lots_csv($row['lots_raw'] ?? null),
            (int) $row['total_qty'],
            $expDate ?: '',
            $expDate ? round($status['diff']) : '',
            $status['statusText'],
        ]);
    }

    fclose($output);
    exit;
}

// Count / fetch grouped by HanaPart + IM
$total_rows = expiry_count_groups($condb, $whereStr);
$puid_total = expiry_count_puids($condb, $whereStr);
$total_pages = max(1, (int) ceil($total_rows / $limit));

$grouped_rows = expiry_fetch_grouped($condb, $whereStr, $limit, $start);

$res_sync_lists = [];
$resSummarySql = "SELECT ReservationNo AS res_no, COUNT(*) AS puid_cnt, MAX(updated_at) AS last_upd
    FROM inventory_receive $whereStr
    AND ReservationNo IS NOT NULL AND ReservationNo <> ''
    GROUP BY ReservationNo
    ORDER BY last_upd ASC, ReservationNo DESC
    LIMIT 80";
$resSummaryRes = $condb->query($resSummarySql);
if ($resSummaryRes) {
    while ($r = $resSummaryRes->fetch_assoc()) {
        $res_sync_lists[] = $r;
    }
}

$synced_res_highlight = isset($_GET['synced_res']) ? trim($_GET['synced_res']) : '';

$page_title = __('exp_check_title');
$page_icon = 'fa-hourglass-half';
$show_home = true;
$include_style_css = false;
$extra_head_links = [
    '<link rel="stylesheet" href="assets/factory.css?v=20260611">',
    '<link rel="stylesheet" href="assets/pages-common.css?v=20260607">',
    '<link rel="stylesheet" href="assets/pages/check-expiration.css?v=20260624">',
];
require_once __DIR__ . '/includes/head.php';
?>
    </head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<?php require __DIR__ . '/includes/layout_status_bar.php'; ?>
<main class="fx-main">
    <div class="container">
        <p class="ce-page-lead">
            <?= __('timestamp') == 'Time' ? 'Check Stock Expiration Dates' : 'ตรวจสอบวันหมดอายุสินค้าในคลัง' ?>
        </p>
        <p class="ce-group-hint">
            <?= $isEN
                ? 'Grouped by HanaPart + IM (same as email report). Earliest expiry date shown per group.'
                : 'แสดงรวมตาม HanaPart + IM (รูปแบบเดียวกับอีเมลแจ้งเตือน) — วันหมดอายุคือวันที่เร็วที่สุดในกลุ่ม' ?>
            <?php if ($puid_total > 0): ?>
                <span class="ce-group-hint__meta">
                    <?= $isEN
                        ? number_format($total_rows) . ' group(s), ' . number_format($puid_total) . ' PUID reel(s)'
                        : number_format($total_rows) . ' กลุ่ม จาก ' . number_format($puid_total) . ' PUID' ?>
                </span>
            <?php endif; ?>
        </p>

        <?php
        $syncClass = 'fx-alert-info';
        $syncScopeNote = $isEN
            ? 'Central sync: expired + within 7 days (CPK first — per-RES is fastest).'
            : 'Sync ส่วนกลาง: เฉพาะหมดอายุ/ใกล้หมด 7 วัน (CPK ก่อน — Sync แยก RES เร็วที่สุด)';
        $syncText = $syncScopeNote . ' '
            . ($isEN ? 'Filter by RES for a smaller list.' : 'ระบุเลข RES เพื่อ Sync เฉพาะใบจองนั้น');
        if ($res_no !== '') {
            $syncText = $syncScopeNote . ' '
                . ($isEN ? 'RES ' . htmlspecialchars($res_no) . '.' : 'RES ' . htmlspecialchars($res_no));
        }
        if (!empty($_GET['synced'])) {
            $syncClass = 'fx-alert-success';
            $syncText = $isEN
                ? 'Central sync completed. Showing updated data.'
                : 'Sync จากระบบกลางแล้ว — บันทึกทับในฐานข้อมูลแล้ว';
        }
        $syncBtnLabel = $res_no !== ''
            ? ($isEN ? 'Sync this RES' : 'Sync RES นี้')
            : ($isEN ? 'Sync all (station)' : 'Sync ทั้งสถานี');
        ?>
        <div class="fx-alert ce-sync-banner <?= $syncClass ?>">
            <span><i class="fas fa-cloud-download-alt"></i> <?= $syncText ?></span>
            <button type="button" class="fx-btn fx-btn-accent" id="btnSyncCpk">
                <i class="fas fa-sync-alt"></i> <?= $syncBtnLabel ?>
            </button>
        </div>

        <!-- Filters -->
        <form method="GET" class="filter-card ce-filter">
            <div class="ce-filter-grid">
                <div class="ce-filter-field ce-filter-field--res">
                    <label class="fx-field-label" for="resNoFilter"><?= $isEN ? 'RES No.' : 'เลข RES' ?></label>
                    <input type="text" class="fx-scan-input" name="res_no" id="resNoFilter" list="resNoList"
                        value="<?= htmlspecialchars($res_no) ?>"
                        placeholder="<?= $isEN ? 'Scan RES or number' : 'สแกน RES หรือเลขใบจอง' ?>"
                        autocomplete="off"
                        inputmode="numeric">
                    <datalist id="resNoList">
                        <?php foreach ($res_no_options as $opt): ?>
                            <option value="<?= htmlspecialchars($opt) ?>"></option>
                        <?php endforeach; ?>
                    </datalist>
                </div>
                <div class="ce-filter-field ce-filter-field--search">
                    <label class="fx-field-label" for="expSearchInput"><?= $isEN ? 'Search' : 'ค้นหา' ?></label>
                    <input type="text" class="fx-scan-input" name="search" id="expSearchInput" value="<?= htmlspecialchars($search) ?>"
                        placeholder="<?= $isEN ? 'Part / IM / PUID' : 'Part / IM / PUID' ?>"
                        oninput="this.value = this.value.toUpperCase().replace(/^VL/, '');">
                </div>
                <div class="ce-filter-field ce-filter-field--status">
                    <label class="fx-field-label" for="expStatusSelect"><?= $isEN ? 'Status' : 'สถานะ' ?></label>
                    <select class="fx-scan-input" name="status" id="expStatusSelect">
                        <option value="all" <?= $status_filter == 'all' ? 'selected' : '' ?>>
                            <?= $isEN ? 'Expired & Soon (7d)' : 'หมดอายุ & ใกล้หมด (7 วัน)' ?>
                        </option>
                        <option value="expired" <?= $status_filter == 'expired' ? 'selected' : '' ?>>
                            <?= $isEN ? 'Expired only' : 'หมดอายุแล้ว' ?>
                        </option>
                        <option value="soon" <?= $status_filter == 'soon' ? 'selected' : '' ?>>
                            <?= $isEN ? 'Expiring soon (7d)' : 'ใกล้หมดอายุ (7 วัน)' ?>
                        </option>
                        <option value="normal" <?= $status_filter == 'normal' ? 'selected' : '' ?>>
                            <?= $isEN ? 'Normal (>7d)' : 'ปกติ (>7 วัน)' ?>
                        </option>
                        <option value="all_stock" <?= $status_filter == 'all_stock' ? 'selected' : '' ?>>
                            <?= $isEN ? 'All stock' : 'สต็อกทั้งหมด' ?>
                        </option>
                    </select>
                </div>
                <div class="ce-filter-actions">
                    <div class="ce-filter-actions__group">
                        <button type="submit" class="fx-btn fx-btn-accent">
                            <i class="fas fa-search" aria-hidden="true"></i> <?= __('search_btn') ?>
                        </button>
                        <?php if ($search || $status_filter !== 'all' || $res_no !== ''): ?>
                            <a href="check_expiration" class="fx-btn fx-btn-secondary"><?= $isEN ? 'Clear' : 'ล้างค่า' ?></a>
                        <?php endif; ?>
                    </div>
                    <a href="?export=excel&search=<?= urlencode($search) ?>&status=<?= urlencode($status_filter) ?>&res_no=<?= urlencode($res_no) ?>"
                        class="fx-btn fx-btn-secondary ce-btn-export">
                        <i class="fas fa-file-excel" aria-hidden="true"></i> <?= $isEN ? 'Export' : 'ส่งออก Excel' ?>
                    </a>
                </div>
            </div>
        </form>

        <?php if (count($res_sync_lists) > 0): ?>
        <div class="res-sync-panel">
            <h3>
                <i class="fas fa-list-alt"></i>
                <?= $isEN ? 'Sync by RES list (expired / 7-day scope)' : 'Sync แยกตามใบจอง RES (เฉพาะหมดอายุ / 7 วัน)' ?>
            </h3>
            <p class="ce-res-sync-hint">
                <?= $isEN
                    ? 'Click Sync on each RES to refresh expiration from central and save to DB. Last update shows warehouse record time.'
                    : 'กด Sync แต่ละใบจองเพื่อดึงวันหมดอายุจากส่วนกลางและบันทึกทับในคลัง — เวลาล่าสุดคือ updated_at ในระบบ' ?>
            </p>
            <div class="res-sync-grid">
                <?php foreach ($res_sync_lists as $resItem):
                    $cardRes = $resItem['res_no'];
                    $lastUpd = $resItem['last_upd'] ?? '';
                    $lastUpdFmt = $lastUpd ? date('d/m/Y H:i', strtotime($lastUpd)) : ($isEN ? 'Never' : 'ยังไม่เคย');
                    $cardClass = 'res-sync-card';
                    if ($synced_res_highlight !== '' && $synced_res_highlight === $cardRes) {
                        $cardClass .= ' is-done';
                    } elseif ($res_no !== '' && $res_no === $cardRes) {
                        $cardClass .= ' is-active';
                    }
                ?>
                <div class="<?= $cardClass ?>" data-res-no="<?= htmlspecialchars($cardRes) ?>">
                    <div class="res-sync-card__head">
                        <span class="res-sync-card__no" title="<?= htmlspecialchars($cardRes) ?>"><?= htmlspecialchars($cardRes) ?></span>
                        <button type="button" class="fx-btn fx-btn-secondary ce-res-sync-btn btn-sync-res-list"
                            data-res-no="<?= htmlspecialchars($cardRes) ?>"
                            title="<?= $isEN ? 'Sync this RES from central' : 'Sync ใบจองนี้จากส่วนกลาง' ?>">
                            <i class="fas fa-sync-alt"></i> Sync
                        </button>
                    </div>
                    <div class="res-sync-card__meta"><?= (int) $resItem['puid_cnt'] ?> PUID</div>
                    <div class="res-sync-card__upd res-last-upd">
                        <?= $isEN ? 'Updated: ' : 'อัปเดต: ' ?><span class="res-last-upd-time"><?= htmlspecialchars($lastUpdFmt) ?></span>
                    </div>
                    <div class="res-sync-card__upd res-sync-msg" style="display:none;"></div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>

        <div class="ce-status-legend" aria-hidden="false">
            <span class="ce-legend-item ce-legend-item--expired">
                <i class="fas fa-times-circle"></i>
                <?= $isEN ? 'Expired' : 'หมดอายุแล้ว' ?>
            </span>
            <span class="ce-legend-item ce-legend-item--soon">
                <i class="fas fa-exclamation-triangle"></i>
                <?= $isEN ? 'Expiring within 7 days' : 'ใกล้หมดอายุ (≤7 วัน)' ?>
            </span>
            <span class="ce-legend-item ce-legend-item--normal">
                <i class="fas fa-check-circle"></i>
                <?= $isEN ? 'Normal' : 'ปกติ' ?>
            </span>
        </div>

        <!-- Data Table -->
        <div class="table-container ce-table-wrap">
            <table class="ce-expiration-table">
                <thead>
                    <tr>
                        <th style="text-align:center; width:60px;">#</th>
                        <th><?= __('stats_products') ?></th>
                        <th style="text-align:center;"><?= $isEN ? 'PUID Count' : 'จำนวน PUID' ?></th>
                        <th><?= $isEN ? 'Lot Number(s)' : 'Lot No.' ?></th>
                        <th><?= $isEN ? 'Total Qty' : 'รวม Qty' ?></th>
                        <th><?= __('exp_date') ?></th>
                        <th class="col-status"><?= __('status') ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (count($grouped_rows) > 0): ?>
                        <?php
                        $i = $start + 1;
                        $today = date('Y-m-d');
                        foreach ($grouped_rows as $row):
                            $expDate = $row['ExpirationDate'] ?? null;
                            $status = expiry_status_meta($expDate, $isEN, $today);
                            $lotsText = expiry_format_lots_csv($row['lots_raw'] ?? null, 3);
                        ?>
                            <tr class="<?= $status['rowClass'] ?>">
                                <td style="text-align:center; color:#94a3b8;">
                                    <?= $i++ ?>
                                </td>
                                <td>
                                    <div style="font-weight:700; color:var(--text-main);">
                                        <?= htmlspecialchars($row['HanaPart']) ?>
                                    </div>
                                    <div style="font-size:0.85rem; color:var(--text-light);">
                                        <?= htmlspecialchars($row['IM']) ?>
                                    </div>
                                </td>
                                <td style="text-align:center; font-weight:700;">
                                    <?= number_format((int) $row['puid_count']) ?>
                                </td>
                                <td style="font-size:0.9rem;">
                                    <?= htmlspecialchars($lotsText) ?>
                                </td>
                                <td style="font-weight:700; font-size:1rem; text-align:center;">
                                    <?= number_format((int) $row['total_qty']) ?>
                                </td>
                                <td>
                                    <?php if ($expDate): ?>
                                    <div class="date-display">
                                        <span class="ce-exp-date">
                                            <?= date('d/m/Y', strtotime($expDate)) ?>
                                        </span>
                                        <span class="days-left days-left--<?= htmlspecialchars(str_replace('status-', '', $status['statusClass'])) ?>">
                                            <?= $status['daysText'] ?>
                                        </span>
                                    </div>
                                    <?php else: ?>
                                        <span style="color:#94a3b8;">—</span>
                                    <?php endif; ?>
                                </td>
                                <td class="col-status">
                                    <span class="status-badge <?= $status['statusClass'] ?>">
                                        <i class="fas <?= $status['icon'] ?>"></i>
                                        <?= $status['text'] ?>
                                    </span>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="7" style="text-align:center; padding:50px; color:#94a3b8;">
                                <i class="fas fa-boxes" style="font-size:3rem; margin-bottom:15px; opacity:0.3;"></i>
                                <p><?= __('no_data') ?></p>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <?php
        $cePaginationMeta = $isEN
            ? 'Page ' . $page . ' of ' . $total_pages . ' (' . number_format((int) $total_rows) . ' groups, ' . number_format((int) $puid_total) . ' PUIDs)'
            : 'หน้า ' . $page . ' จาก ' . $total_pages . ' (' . number_format((int) $total_rows) . ' กลุ่ม จาก ' . number_format((int) $puid_total) . ' PUID)';
        echo render_pagination_html($page, (int) $total_pages, pagination_href_prefix($_GET), [
            'meta' => $cePaginationMeta,
        ]);
        ?>

    </div>

    <script>
        const expSyncContext = {
            search: <?= json_encode($search) ?>,
            res_no: <?= json_encode($res_no) ?>,
            status: <?= json_encode($status_filter) ?>,
            isEN: <?= $isEN ? 'true' : 'false' ?>
        };

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

        (function () {
            const resInput = document.getElementById('resNoFilter');
            if (!resInput) return;
            resInput.addEventListener('input', function () { applyResInputNormalize(resInput); });
            resInput.addEventListener('paste', function () {
                setTimeout(function () { applyResInputNormalize(resInput); }, 0);
            });
            const filterForm = resInput.closest('form');
            if (filterForm) {
                filterForm.addEventListener('submit', function () {
                    applyResInputNormalize(resInput);
                });
            }
        })();

        function formatNowLocal() {
            const d = new Date();
            const pad = function (n) { return String(n).padStart(2, '0'); };
            return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear()
                + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        }

        function setResSyncCardState(resNo, message, ok) {
            document.querySelectorAll('.res-sync-card[data-res-no]').forEach(function (card) {
                if (card.getAttribute('data-res-no') !== resNo) return;
                card.classList.remove('is-done');
                if (ok) card.classList.add('is-done');
                const msgEl = card.querySelector('.res-sync-msg');
                const timeEl = card.querySelector('.res-last-upd-time');
                if (ok && timeEl) {
                    timeEl.textContent = formatNowLocal();
                }
                if (msgEl && message) {
                    msgEl.style.display = 'block';
                    msgEl.textContent = message;
                }
            });
        }

        function runCentralSync(resNo, btn, options) {
            options = options || {};
            const icon = btn ? btn.querySelector('i') : null;
            const btnLabel = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' +
                    (expSyncContext.isEN ? 'Syncing…' : 'กำลัง Sync…');
            }
            if (icon) icon.classList.add('spin-anim');

            const payload = {
                call: 'sync_station_inventory.php',
                search: expSyncContext.search
            };
            if (resNo) {
                payload.res_no = resNo;
            }

            return fetch('api_gateway.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.status === 'success' || data.status === 'skipped') {
                        if (resNo) {
                            setResSyncCardState(resNo, data.message || (expSyncContext.isEN ? 'Updated' : 'อัปเดตแล้ว'), true);
                        }
                        if (options.reload) {
                            const params = new URLSearchParams(window.location.search);
                            params.delete('synced');
                            params.delete('synced_res');
                            params.set('synced', '1');
                            if (resNo) params.set('synced_res', resNo);
                            window.location.search = params.toString();
                            return data;
                        }
                        return data;
                    }
                    alert((expSyncContext.isEN ? 'Sync failed: ' : 'Sync ไม่สำเร็จ: ') + (data.message || ''));
                    return data;
                })
                .catch(function (err) {
                    alert('Error: ' + err);
                })
                .finally(function () {
                    if (btn) {
                        btn.disabled = false;
                        if (btnLabel) btn.innerHTML = btnLabel;
                    }
                    if (icon) icon.classList.remove('spin-anim');
                });
        }

        document.querySelectorAll('.btn-sync-res-list').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const resNo = (btn.getAttribute('data-res-no') || '').trim();
                if (!resNo) return;
                runCentralSync(resNo, btn, { reload: true });
            });
        });

        document.getElementById('btnSyncCpk')?.addEventListener('click', function () {
            const resInput = document.getElementById('resNoFilter');
            const resNo = (resInput && applyResInputNormalize(resInput)) || expSyncContext.res_no || '';

            if (!resNo && !expSyncContext.isEN && !confirm('Sync ทั้งสถานีใช้เวลานาน — แนะนำกด Sync แยกแต่ละ RES ด้านล่าง\nต้องการ Sync ทั้งสถานีต่อไปหรือไม่?')) {
                return;
            }
            if (!resNo && expSyncContext.isEN && !confirm('Full station sync may take a long time.\nUse per-RES Sync buttons below. Continue?')) {
                return;
            }

            runCentralSync(resNo || null, this, { reload: true });
        });
    </script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>