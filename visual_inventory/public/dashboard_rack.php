<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once __DIR__ . '/../config/warehouse_structure.php';

// 1. Fetch Summary Stats
$stats = [
    'total_products' => 0,
    'total_racks' => 0,
    'total_boxes' => 0,
    'active_boxes' => 0
];

// Product Count (products.qty + active PUID rows in inventory_receive)
$res = $condb->query("SELECT SUM(qty) as total FROM products");
$stats['total_products'] = (int) ($res->fetch_assoc()['total'] ?? 0);
$invRes = $condb->query(
    "SELECT COUNT(DISTINCT PUID) AS total FROM inventory_receive
     WHERE QtyRemain > 0 AND StatusName NOT IN ('Withdrawn', 'Empty')"
);
if ($invRes) {
    $invTotal = (int) ($invRes->fetch_assoc()['total'] ?? 0);
    if ($invTotal > $stats['total_products']) {
        $stats['total_products'] = $invTotal;
    }
}

// Rack Count
$res = $condb->query("SELECT COUNT(*) as total FROM racks");
$stats['total_racks'] = $res->fetch_assoc()['total'] ?? 0;

// Box Count
$res = $condb->query("SELECT COUNT(*) as total FROM boxes");
$stats['total_boxes'] = $res->fetch_assoc()['total'] ?? 0;

// 2. Fetch Box Quantities
$box_data = [];
$sql = "SELECT b.id, SUM(p.qty) as total_qty 
        FROM boxes b 
        LEFT JOIN slots sl ON b.id = sl.box_id 
        LEFT JOIN products p ON sl.id = p.slot_id 
        GROUP BY b.id";
$box_inv_qty = [];
$invBoxSql = "SELECT bx.id AS box_id, COUNT(DISTINCT ir.PUID) AS inv_qty
              FROM inventory_receive ir
              JOIN racks r ON ir.Loc_Shelf = r.name
              JOIN levels lv ON CAST(ir.Loc_Level AS UNSIGNED) = lv.level_no AND lv.rack_id = r.id
              JOIN boxes bx ON ir.Loc_Box = bx.box_code AND bx.level_id = lv.id
              WHERE ir.QtyRemain > 0
                AND ir.StatusName NOT IN ('Withdrawn', 'Empty')
              GROUP BY bx.id";
$invBoxQ = $condb->query($invBoxSql);
if ($invBoxQ) {
    while ($invRow = $invBoxQ->fetch_assoc()) {
        $box_inv_qty[(int) $invRow['box_id']] = (int) $invRow['inv_qty'];
    }
}

$q = $condb->query($sql);
while ($r = $q->fetch_assoc()) {
    $boxId = (int) $r['id'];
    $qty = max((int) $r['total_qty'], (int) ($box_inv_qty[$boxId] ?? 0));
    $box_data[$boxId] = $qty;
    if ($qty > 0) {
        $stats['active_boxes']++;
    }
}

// HanaPart per box (from products in slots)
$box_hana_parts = [];
$hpSql = "SELECT b.id AS box_id, p.name AS hana_part
          FROM boxes b
          JOIN slots sl ON b.id = sl.box_id
          JOIN products p ON sl.id = p.slot_id
          WHERE p.qty > 0 AND TRIM(p.name) <> ''
          ORDER BY b.id, sl.slot_no ASC";
$hpQ = $condb->query($hpSql);
while ($hpRow = $hpQ->fetch_assoc()) {
    $bid = (int) $hpRow['box_id'];
    $part = trim((string) $hpRow['hana_part']);
    if ($part === '') {
        continue;
    }
    if (!isset($box_hana_parts[$bid])) {
        $box_hana_parts[$bid] = [];
    }
    if (!in_array($part, $box_hana_parts[$bid], true)) {
        $box_hana_parts[$bid][] = $part;
    }
}

// 3. Fetch Structure (batch — avoids N+1 per rack/level)
$warehouse = warehouse_hierarchy($condb, 'position_in_level');

$page_title = __('rack_dashboard');
$page_icon = 'fa-chart-bar';
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
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/dashboard-rack.css?v=20260607">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main">
    <div class="container">
        <div class="fx-scan-toolbar" style="margin-bottom:1rem;flex-wrap:wrap;">
            <a href="search_product" class="fx-btn fx-btn-secondary"><i class="fas fa-search"></i>
                <?= __('search_product') ?></a>
            <button class="fx-btn fx-btn-secondary active" id="btnGrid" type="button" onclick="switchView('grid')"><i
                    class="fas fa-th"></i> <?= __('view_visual') ?></button>
            <button class="fx-btn fx-btn-secondary" id="btnTable" type="button" onclick="switchView('table')"><i
                    class="fas fa-list"></i> <?= __('view_table') ?></button>
        </div>
        <p style="color:#64748b;margin:0 0 1.5rem;"><?= __('system_desc') ?></p>

        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background: #e0e7ff; color: var(--primary);">
                    <i class="fas fa-cube"></i>
                </div>
                <div class="stat-info">
                    <h3><?= number_format($stats['total_products']) ?></h3>
                    <p><?= __('total_qty') ?></p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #fef3c7; color: var(--warning);">
                    <i class="fas fa-box-open"></i>
                </div>
                <div class="stat-info">
                    <h3><?= number_format($stats['total_boxes']) ?></h3>
                    <p><?= __('stats_boxes') ?></p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #dcfce7; color: var(--success);">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="stat-info">
                    <h3><?= number_format($stats['total_racks']) ?></h3>
                    <p>Rack</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #d1fae5; color: #059669;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                    <h3><?= number_format($stats['active_boxes']) ?></h3>
                    <p><?= __('active_boxes') ?></p>
                </div>
            </div>
        </div>

        <!-- 1. Grid View (Visual) -->
        <div id="gridView" class="rack-grid">
            <?php
            foreach ($warehouse['racks'] as $rack):
            ?>
                <div class="rack-card">
                    <div class="rack-header">Rack <?= htmlspecialchars($rack['name']) ?></div>
                    <div class="rack-body">
                        <?php
                        foreach ($warehouse['levels_by_rack'][(int) $rack['id']] ?? [] as $level):
                        ?>
                            <div class="level-row">
                                <span class="level-label">Level <?= $level['level_no'] ?></span>
                                <div class="box-container">
                                    <?php
                                    foreach ($warehouse['boxes_by_level'][(int) $level['id']] ?? [] as $box):
                                        $qty = $box_data[$box['id']] ?? 0;
                                        if ($qty > 0)
                                            $statusClass = 'status-active';
                                        else
                                            $statusClass = 'status-empty';
                                        $badgeColorClass = ($qty > 0) ? 'box-badge-active' : 'box-badge-empty';
                                    ?>
                                        <a href="javascript:void(0)" class="box-item <?= $statusClass ?>"
                                            title="Box: <?= $box['box_code'] ?> | Qty: <?= $qty ?>"
                                            onclick="showBoxDetails(<?= $box['id'] ?>, '<?= $box['box_code'] ?>')">
                                            <?= htmlspecialchars($box['box_code']) ?>
                                            <span class="box-badge <?= $badgeColorClass ?>"><?= $qty ?></span>
                                        </a>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>

        <!-- 2. Table View (Hidden by default) -->
        <div id="tableView" style="display:none;">
            <div class="table-card">
                <table>
                    <thead>
                        <tr>
                            <th>Rack</th>
                            <th><?= __('level') ?></th>
                            <th><?= __('box_code') ?></th>
                            <th><?= __('hana_part') ?></th>
                            <th><?= __('total_qty') ?></th>
                            <th><?= __('status') ?></th>
                            <th><?= __('manage') ?></th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        <?php
                        foreach ($warehouse['racks'] as $rack):
                            foreach ($warehouse['levels_by_rack'][(int) $rack['id']] ?? [] as $level):
                                foreach ($warehouse['boxes_by_level'][(int) $level['id']] ?? [] as $box):
                                    $qty = $box_data[$box['id']] ?? 0;
                                    $hanaList = $box_hana_parts[$box['id']] ?? [];
                                    $hanaDisplay = $hanaList !== []
                                        ? implode(', ', $hanaList)
                                        : '—';

                                    if ($qty > 0) {
                                        $badgeClass = 'badge-active';
                                        $text = __('available');
                                    } else {
                                        $badgeClass = 'badge-empty';
                                        $text = __('no_product');
                                    }
                        ?>
                                    <tr>
                                        <td>Rack <?= htmlspecialchars($rack['name']) ?></td>
                                        <td>Level <?= htmlspecialchars($level['level_no']) ?></td>
                                        <td style="font-weight:600;"><?= htmlspecialchars($box['box_code']) ?></td>
                                        <td style="font-size:0.9rem; color:#334155; max-width:280px; word-break:break-word;">
                                            <?= htmlspecialchars($hanaDisplay) ?>
                                        </td>
                                        <td style="<?= $qty == 0 ? 'color: #ef4444; font-weight: bold;' : '' ?>">
                                            <?= number_format($qty) ?>
                                        </td>
                                        <td><span class="badge <?= $badgeClass ?>"><?= $text ?></span></td>
                                        <td><button class="btn-white" style="padding:4px 8px; font-size:0.8rem;"
                                                onclick="showBoxDetails(<?= $box['id'] ?>, '<?= $box['box_code'] ?>')"><?= __('box_details') ?></button>
                                        </td>
                                    </tr>
                        <?php
                                endforeach;
                            endforeach;
                        endforeach;
                        ?>
                    </tbody>
                </table>
            </div>

            <!-- Pagination Controls -->
            <div id="pagination" class="pagination-container">
                <!-- JS will inject buttons here -->
            </div>
        </div>

    </div>

    <!-- Details Modal -->
    <div id="boxModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <h2 id="modalTitle" style="margin-top:0; color:var(--primary);"><?= __('box_details') ?></h2>
            <div id="modalBody">
                <p><?= __('logout') == 'Logout' ? 'Loading...' : 'กำลังโหลด...' ?></p>
            </div>
            <div style="margin-top:20px; text-align:right;">
                <button class="btn btn-primary"
                    onclick="closeModal()"><?= __('logout') == 'Logout' ? 'Close' : 'ปิดหน้าต่าง' ?></button>
            </div>
        </div>
    </div>

    <script>
        // Use Global state for view preference
        let currentView = 'grid';
        let currentPage = 1;
        const rowsPerPage = 10;

        function switchView(viewName) {
            currentView = viewName;

            const btnGrid = document.getElementById('btnGrid');
            const btnTable = document.getElementById('btnTable');
            const grid = document.getElementById('gridView');
            const table = document.getElementById('tableView');

            if (viewName === 'grid') {
                btnGrid.classList.add('active');
                btnGrid.classList.remove('btn-white');
                btnTable.classList.remove('active');
                btnTable.classList.add('btn-white');

                grid.style.display = 'flex';
                table.style.display = 'none';
            } else {
                btnTable.classList.add('active');
                btnTable.classList.remove('btn-white');
                btnGrid.classList.remove('active');
                btnGrid.classList.add('btn-white');

                grid.style.display = 'none';
                table.style.display = 'block';

                renderTablePage(1); // Reset to page 1 on switch
            }
        }

        // Pagination Logic
        function renderTablePage(page) {
            currentPage = page;
            const tableBody = document.getElementById('tableBody');
            const rows = tableBody.getElementsByTagName('tr');
            const totalRows = rows.length;
            const totalPages = Math.ceil(totalRows / rowsPerPage);

            // Hide all
            for (let i = 0; i < totalRows; i++) {
                rows[i].style.display = 'none';
            }

            // Show current slice
            const start = (page - 1) * rowsPerPage;
            const end = start + rowsPerPage;
            for (let i = start; i < end && i < totalRows; i++) {
                rows[i].style.display = '';
            }

            renderPaginationControls(totalPages);
        }

        function paginationPageNumbers(current, total, radius = 2) {
            if (total <= 1) return [];
            current = Math.max(1, Math.min(current, total));
            const windowStart = Math.max(1, current - radius);
            const windowEnd = Math.min(total, current + radius);
            const pages = [];

            if (windowStart > 1) {
                pages.push(1);
                if (windowStart > 2) pages.push(0);
            }
            for (let p = windowStart; p <= windowEnd; p++) pages.push(p);
            if (windowEnd < total) {
                if (windowEnd < total - 1) pages.push(0);
                pages.push(total);
            }
            return pages;
        }

        function renderPaginationControls(totalPages) {
            const container = document.getElementById('pagination');
            if (totalPages <= 1) {
                container.innerHTML = '';
                return;
            }

            const pageNumbers = paginationPageNumbers(currentPage, totalPages, 2);
            let html = '';

            if (currentPage > 1) {
                html += `<a href="#" class="page-btn" onclick="renderTablePage(${currentPage - 1}); return false;"><i class="fas fa-chevron-left"></i></a>`;
            } else {
                html += `<span class="page-btn disabled" aria-disabled="true"><i class="fas fa-chevron-left"></i></span>`;
            }

            pageNumbers.forEach((p) => {
                if (p === 0) {
                    html += '<span class="page-ellipsis" aria-hidden="true">…</span>';
                } else if (p === currentPage) {
                    html += `<span class="page-btn active">${p}</span>`;
                } else {
                    html += `<a href="#" class="page-btn" onclick="renderTablePage(${p}); return false;">${p}</a>`;
                }
            });

            if (currentPage < totalPages) {
                html += `<a href="#" class="page-btn" onclick="renderTablePage(${currentPage + 1}); return false;"><i class="fas fa-chevron-right"></i></a>`;
            } else {
                html += `<span class="page-btn disabled" aria-disabled="true"><i class="fas fa-chevron-right"></i></span>`;
            }

            container.innerHTML = html;
        }

        function showBoxDetails(boxId, boxCode) {
            const modal = document.getElementById('boxModal');
            const title = document.getElementById('modalTitle');
            const body = document.getElementById('modalBody');
            const isEN = <?= json_encode($_SESSION['lang'] == 'en') ?>;

            title.innerText = '📦 ' + (isEN ? 'Box Details' : 'รายละเอียด Box') + ': ' + boxCode;
            body.innerHTML = `<p style="text-align:center; color:#666;">⏳ ${isEN ? 'Loading data...' : 'กำลังโหลดข้อมูล...'}</p>`;
            modal.style.display = 'block';

            const basePath = "<?= rtrim(dirname($_SERVER['PHP_SELF']), '/\\') ?>";
            const fetchUrl = `api_gateway.php?call=get_box_products.php&box_id=${boxId}&t=${new Date().getTime()}`;

            fetch(fetchUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            })
                .then(res => {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .then(data => {
                    if (data.length === 0) {
                        body.innerHTML = `
                            <div style="text-align:center; padding:20px;">
                                <div style="margin-bottom:15px;">
                                    <span class="badge" style="background:#fee2e2; color:#ef4444; padding:8px 16px; font-size:1rem; border:1px solid #fecaca;">
                                        <i class="fas fa-times-circle"></i> ${isEN ? 'No Products' : 'ไม่มีสินค้า'}
                                    </span>
                                </div>
                                <div style="position:relative; display:inline-block;">
                                    <i class="fas fa-box-open" style="font-size:5rem; color:#ef4444; margin-bottom:15px; opacity:0.3;"></i>
                                    <span style="position:absolute; top:-5px; right:-15px; background:#ef4444; color:white; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.2rem; box-shadow:0 4px 6px rgba(0,0,0,0.2);">0</span>
                                </div>
                                <div style="color:#ef4444; font-weight:700; font-size:1.3rem; margin-top:10px;">${isEN ? 'Total Qty' : 'จำนวนรวม'}: 0</div>
                                <div style="color:#64748b; margin-top:5px;">${isEN ? 'This box is empty' : 'ยังไม่มีสินค้าถูกจัดเก็บใน Box นี้'}</div>
                            </div>`;
                        return;
                    }

                    let html = `
                        <div style="margin-bottom:20px; text-align:center;">
                            <span class="badge" style="background:#dcfce7; color:#10b981; padding:8px 16px; font-size:1rem; border:1px solid #bbf7d0;">
                                <i class="fas fa-layer-group"></i> ${isEN ? 'Divided into' : 'แบ่งเป็น'} ${data.length} Slot
                            </span>
                        </div>
                        <ul class="modal-list">`;

                    data.forEach(item => {
                        let qty = parseInt(item.qty) || 0;
                        let name = item.name || (qty === 0 ? `<span style="color:#ef4444;">(${isEN ? 'Empty' : 'ว่าง - ไม่มีสินค้า'})</span>` : (isEN ? 'Unknown Product' : 'ไม่ทราบชื่อสินค้า'));
                        let slot_no = item.slot_no || '-';
                        let color = qty > 0 ? '#10b981' : '#ef4444';
                        let bgItem = qty > 0 ? 'transparent' : '#fff5f5';

                        let puidsHtml = '';
                        if (item.puids && item.puids.length > 0) {
                            puidsHtml = `<div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:5px;">
                                ${item.puids.map(p => `<span style="background:#eff6ff; color:#1d4ed8; padding:2px 8px; border-radius:6px; font-size:0.75rem; font-weight:600; border:1px solid #dbeafe; font-family: 'Roboto Mono', monospace;">${p}</span>`).join('')}
                            </div>`;
                        }

                        html += `<li style="background:${bgItem}; border-radius:12px; margin-bottom:10px; padding:15px; border: 1px solid ${qty > 0 ? '#e2e8f0' : '#fecaca'}; transition: all 0.2s;">
                            <div style="flex:1;">
                                <strong style="display:block; color:${qty > 0 ? '#0f172a' : '#ef4444'}; font-size:1rem; margin-bottom:2px;">Slot: ${slot_no}</strong>
                                <span style="font-size:0.9rem; color:#64748b; font-weight:500;">${name}</span>
                                ${puidsHtml}
                            </div>
                            <div style="font-weight:800; color:${color}; font-size:1.3rem; margin-left:15px;">x ${qty}</div>
                         </li>`;
                    });
                    html += '</ul>';
                    body.innerHTML = html;
                })
                .catch(err => {
                    console.error(err);
                    const isEN = <?= json_encode($_SESSION['lang'] == 'en') ?>;
                    body.innerHTML = `<p style="color:var(--danger); text-align:center;">${isEN ? 'Error loading data' : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'}<br><small style="color:#666;">${err.message}</small></p>`;
                });
        }

        function closeModal() {
            document.getElementById('boxModal').style.display = 'none';
        }

        window.onclick = function(event) {
            const modal = document.getElementById('boxModal');
            if (event.target == modal) {
                closeModal();
            }
        }

        // Init
        // Pre-hide pagination rows if wanted, but simpler to just init on switch
    </script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>