<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once("../config/helpers.php");

/**
 * Report categories: add, res_receive, picklist issue, CPK booking out.
 *
 * @return array{kind: string, actionText: string, puid: string, subQty: int}
 */
function report_stock_parse_log_action(string $actionStr, bool $isEN, ?string $remark = null): array
{
    $puid = '-';
    $subQty = 0;
    $kind = 'picklist_issue';
    $picklistLabel = '';
    $resLabel = '';

    if ($remark !== null && $remark !== '') {
        if (preg_match('/\[Picklist:\s*([^\]]+)\]/', $remark, $plMatch)) {
            $picklistLabel = trim($plMatch[1]);
        }
        if (preg_match('/\[RES:\s*([^\]]+)\]/', $remark, $resMatch)) {
            $resLabel = trim($resMatch[1]);
        }
    }

    if (strpos($actionStr, '|') !== false) {
        $parts = explode('|', $actionStr);
        $head = $parts[0];

        if ($head === 'add') {
            $kind = $resLabel !== '' ? 'res_receive' : 'add';
            $subQty = (int) ($parts[1] ?? 0);
            $puid = $parts[2] ?? '-';
        } elseif ($head === 'res_receive') {
            $kind = 'res_receive';
            $subQty = (int) ($parts[1] ?? 0);
            $puid = $parts[2] ?? '-';
        } elseif (str_starts_with($head, 'booking_out_')) {
            $kind = 'booking_out';
            $subQty = (int) ($parts[1] ?? 0);
            $puid = $parts[2] ?? '-';
            $dest = strtoupper(substr($head, strlen('booking_out_')));
            $actionText = $isEN ? 'Booking Out → ' . $dest : 'ส่งออก CPK → ' . $dest;

            return compact('kind', 'actionText', 'puid', 'subQty');
        } elseif (
            $head === 'picklist_issue'
            || $head === 'withdraw'
            || $head === 'order_withdraw'
            || $head === 'withdraw_bom_scan'
            || $head === 'withdraw_bom_box'
        ) {
            $kind = 'picklist_issue';
            if ($head === 'order_withdraw') {
                $puid = $parts[1] ?? '-';
            } else {
                $subQty = (int) ($parts[1] ?? 0);
                $puid = $parts[2] ?? '-';
            }
        } else {
            $kind = $head;
            $subQty = (int) ($parts[1] ?? 0);
            $puid = $parts[2] ?? '-';
        }
    } elseif (strpos($actionStr, '_') !== false) {
        $parts = explode('_', $actionStr, 2);
        $kind = $parts[0] === 'add' ? 'add' : 'picklist_issue';
        $subQty = (int) ($parts[1] ?? 0);
    } elseif ($actionStr === 'add') {
        $kind = 'add';
    } else {
        $kind = 'picklist_issue';
    }

    if ($kind === 'add') {
        $actionText = $isEN ? 'Receive' : 'รับเข้า (Add Stock)';
    } elseif ($kind === 'res_receive') {
        $actionText = $isEN
            ? ('Receive via RES' . ($resLabel !== '' ? ' (' . $resLabel . ')' : ''))
            : ('รับเข้าใบจอง RES' . ($resLabel !== '' ? ' (' . $resLabel . ')' : ''));
    } elseif ($kind === 'booking_out') {
        $actionText = $isEN ? 'Booking Out' : 'ส่งออก CPK';
    } else {
        $kind = 'picklist_issue';
        $actionText = $isEN
            ? ('Picklist Issue' . ($picklistLabel !== '' ? ' (' . $picklistLabel . ')' : ''))
            : ('เบิกจ่าย Picklist' . ($picklistLabel !== '' ? ' (' . $picklistLabel . ')' : ''));
    }

    return compact('kind', 'actionText', 'puid', 'subQty');
}

/**
 * SQL fragment: hide duplicate RES receive logs (same PUID + remark, keep oldest).
 */
function report_stock_duplicate_res_receive_sql(): string
{
    return "NOT (
        s.action LIKE 'res_receive|%'
        AND EXISTS (
            SELECT 1 FROM stock_logs s_dup
            WHERE s_dup.id < s.id
            AND SUBSTRING_INDEX(s_dup.action, '|', -1) = SUBSTRING_INDEX(s.action, '|', -1)
            AND s_dup.action LIKE 'res_receive|%'
            AND IFNULL(s_dup.remark, '') = IFNULL(s.remark, '')
        )
    )";
}

// --- Configuration ---
$limit = 10;
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$start = ($page - 1) * $limit;

$search = isset($_GET['search']) ? trim($_GET['search']) : "";
$filter_action = isset($_GET['action_filter']) ? trim($_GET['action_filter']) : "";
if ($filter_action === 'withdraw') {
    $filter_action = 'picklist_issue';
}

// --- Build Dynamic Query ---
$whereClauses = [];
$params = [];
$types = "";

if (!empty($search)) {
    $whereClauses[] = "(p.name LIKE ? OR u.username LIKE ? OR s.action LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
    $params[] = "%$search%";
    $types .= "sss";
}

if ($filter_action === 'add') {
    $whereClauses[] = "(s.action LIKE ? AND (s.remark IS NULL OR s.remark = '' OR s.remark NOT LIKE ?))";
    $params[] = 'add%';
    $params[] = '%[RES:%';
    $types .= 'ss';
} elseif ($filter_action === 'res_receive') {
    $whereClauses[] = "(s.action LIKE ? OR (s.action LIKE ? AND s.remark LIKE ?))";
    $params[] = 'res_receive%';
    $params[] = 'add%';
    $params[] = '%[RES:%';
    $types .= 'sss';
} elseif ($filter_action === 'picklist_issue') {
    $whereClauses[] = "(s.action LIKE ? OR s.action LIKE ? OR s.action LIKE ? OR s.action LIKE ? OR s.action = ?)";
    $params[] = 'picklist_issue%';
    $params[] = 'withdraw%';
    $params[] = 'order_withdraw%';
    $params[] = 'withdraw_bom_%';
    $params[] = 'withdraw';
    $types .= 'sssss';
} elseif ($filter_action === 'booking_out') {
    $whereClauses[] = "s.action LIKE ?";
    $params[] = 'booking_out%';
    $types .= 's';
}

$whereClauses[] = report_stock_duplicate_res_receive_sql();

$whereSQL = "";
if (count($whereClauses) > 0) {
    $whereSQL = " WHERE " . implode(" AND ", $whereClauses);
}

// --- 1. Count Total Rows ---
$count_sql = "
    SELECT COUNT(*) AS total
    FROM stock_logs s
    LEFT JOIN products p ON s.product_id = p.id
    LEFT JOIN users u ON s.user_id = u.id
    $whereSQL
";

$count_stmt = $condb->prepare($count_sql);
if (!empty($types)) {
    $count_stmt->bind_param($types, ...$params);
}
$count_stmt->execute();
$total_rows = $count_stmt->get_result()->fetch_assoc()['total'];
$total_pages = ceil($total_rows / $limit);
$count_stmt->close();

// --- 2. Fetch Data ---
$sql = "
    SELECT 
        s.id,
        s.product_id,
        p.name AS product_name,
        s.action,
        s.quantity,
        s.user_id,
        u.username,
        s.remark,
        s.created_at
    FROM stock_logs s
    LEFT JOIN products p ON s.product_id = p.id
    LEFT JOIN users u ON s.user_id = u.id
    $whereSQL
    ORDER BY s.created_at DESC
    LIMIT ?, ?
";

$main_params = $params;
$main_params[] = $start;
$main_params[] = $limit;
$main_types = $types . "ii";

$stmt = $condb->prepare($sql);
$stmt->bind_param($main_types, ...$main_params);
$stmt->execute();
$result = $stmt->get_result();

$isEN = $_SESSION['lang'] == 'en';

$page_title = __('report_title');
$page_icon = 'fa-file-alt';
$show_home = true;
$include_style_css = false;
$extra_head_links = [
    '<link rel="stylesheet" href="assets/factory.css?v=20260611">',
    '<link rel="stylesheet" href="assets/pages-common.css?v=20260607">',
    '<link rel="stylesheet" href="assets/pages/report-stock.css?v=20260626">',
];
require_once __DIR__ . '/includes/head.php';
?>
    </head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main">
    <div class="container">
        <p style="color:#64748b;margin:0 0 1.5rem;">
            <?= $isEN
                ? 'Inventory movement — Add Stock, RES receive, Picklist issue, and CPK booking out'
                : 'ประวัติการรับเข้า (Add Stock / ใบจอง RES) เบิกจ่าย Picklist และส่งออก CPK' ?>
        </p>

        <!-- Filter -->
        <form method="GET" class="filter-card fade-in">
            <div class="form-group" style="flex: 2;">
                <input type="text" name="search" placeholder="🔍 <?= __('search_placeholder') ?>"
                    value="<?= htmlspecialchars($search) ?>" oninput="this.value = this.value.toUpperCase().replace(/^VL/, '');">
            </div>
            <div class="form-group">
                <select name="action_filter">
                    <option value=""><?= __('type') == 'Type' ? '📂 All Types' : '📂 ทุกประเภทรายการ' ?></option>
                    <option value="add" <?= $filter_action == 'add' ? 'selected' : '' ?>>
                        <?= $isEN ? '📥 Add Stock' : '📥 รับเข้า (Add Stock)' ?>
                    </option>
                    <option value="res_receive" <?= $filter_action == 'res_receive' ? 'selected' : '' ?>>
                        <?= $isEN ? '📋 Receive via RES' : '📋 รับเข้าใบจอง RES' ?>
                    </option>
                    <option value="picklist_issue" <?= $filter_action == 'picklist_issue' ? 'selected' : '' ?>>
                        <?= $isEN ? '📋 Picklist Issue' : '📋 เบิกจ่าย Picklist' ?>
                    </option>
                    <option value="booking_out" <?= $filter_action == 'booking_out' ? 'selected' : '' ?>>
                        <?= $isEN ? '📦 Booking Out (Store/Other)' : '📦 ส่งออก CPK (Store/Other)' ?>
                    </option>
                </select>
            </div>
            <button type="submit" class="btn"><?= __('search_btn') ?></button>
            <?php if (!empty($search) || !empty($filter_action)): ?>
                <a href="report_stock" class="btn btn-outline"
                    style="border:none; text-decoration:underline;"><?= __('logout') == 'Logout' ? 'Clear Search' : 'ล้างค่าค้นหา' ?></a>
            <?php endif; ?>
        </form>

        <!-- Table -->
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 60px; text-align:center;">#</th>
                        <th><?= __('stats_products') ?></th>
                        <th>PUID</th>
                        <th><?= __('type') ?></th>
                        <th><?= __('qty') ?></th>
                        <th><?= __('user') ?></th>
                        <th><?= __('timestamp') ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($result->num_rows > 0): ?>
                        <?php
                        $i = $start + 1;
                        while ($row = $result->fetch_assoc()):
                            $prodName = $row['product_name'] ?? '<span style="color:#ef4444; font-style:italic;">' . ($isEN ? 'Product deleted' : 'สินค้าถูกลบ') . ' (ID: ' . $row['product_id'] . ')</span>';
                            $userName = $row['username'] ?? '<span style="color:#94a3b8;">' . ($isEN ? 'Unknown' : 'ไม่ระบุตัวตน') . '</span>';

                            $parsed = report_stock_parse_log_action(
                                (string) $row['action'],
                                $isEN,
                                $row['remark'] ?? null
                            );
                            $baseAction = $parsed['kind'];
                            $actionText = $parsed['actionText'];
                            $puid = $parsed['puid'];
                            $subQty = $parsed['subQty'];

                            if ($subQty == 0 && $puid !== '-') {
                                $qStmt = $condb->prepare("SELECT Qty FROM inventory_receive WHERE PUID = ? LIMIT 1");
                                $qStmt->bind_param("s", $puid);
                                $qStmt->execute();
                                $q_check = $qStmt->get_result();
                                if ($q_row = $q_check->fetch_assoc()) {
                                    $subQty = (int) $q_row['Qty'];
                                }
                                $qStmt->close();
                            }

                            $isAdd = ($baseAction === 'add');
                            $isResReceive = ($baseAction === 'res_receive');
                            $isBookingOut = ($baseAction === 'booking_out');
                            $badgeClass = $isAdd
                                ? 'badge-add'
                                : ($isResReceive ? 'badge-res-receive' : ($isBookingOut ? 'badge-booking-out' : 'badge-picklist'));
                            $badgeIcon = $isAdd
                                ? 'fa-arrow-down'
                                : ($isResReceive ? 'fa-file-invoice' : ($isBookingOut ? 'fa-dolly' : 'fa-list-check'));

                            $date = date('d/m/Y', strtotime($row['created_at']));
                            $time = substr($row['created_at'], 11, 5);
                            $timeSuffix = $isEN ? '' : ' น.';
                        ?>
                            <tr class="stagger-row hover-glow">
                                <td style="text-align:center; color:#94a3b8; font-weight:bold;"><?= $i++ ?></td>
                                <td>
                                    <div style="font-weight:600; color:#334155;"><?= $prodName ?></div>
                                </td>
                                <td>
                                    <?php if ($puid !== '-'): ?>
                                        <span class="puid-tag"><?= htmlspecialchars($puid) ?></span>
                                    <?php else: ?>
                                        <span style="color:#cbd5e1;">-</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="badge <?= $badgeClass ?>">
                                        <i class="fas <?= $badgeIcon ?>"></i> <?= $actionText ?>
                                    </span>
                                </td>
                                <td>
                                    <div style="font-weight:700; font-size:1.1rem; color:#334155;">
                                        <?= number_format($row['quantity']) ?>
                                        <span
                                            style="font-size:0.75rem; color:#94a3b8; font-weight:normal;">(<?= $isEN ? 'Transaction' : 'รายการ' ?>)</span>
                                    </div>
                                    <?php if ($subQty > 0): ?>
                                        <div style="font-size:0.85rem; color:#64748b; margin-top:2px;">
                                            <i class="fas fa-box-open" style="font-size:0.8rem;"></i>
                                            <?= $isEN ? 'Total Qty:' : 'ยอดรวม:' ?>
                                            <b><?= number_format($subQty) ?></b>
                                        </div>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <span style="font-size:0.9rem;"><?= $userName ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div style="font-weight:600;"><?= $date ?></div>
                                    <div class="item-meta"><?= $time . $timeSuffix ?></div>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="7" class="empty-state">
                                <i class="fas fa-clipboard-list"
                                    style="font-size:3rem; margin-bottom:15px; opacity:0.3;"></i>
                                <p><?= __('no_data') ?></p>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <!-- Pagination & Summary -->
        <?php if ($total_rows > 0): ?>
            <div
                style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; flex-wrap:wrap; gap:10px;">
                <div style="color:#64748b; font-size:0.9rem;">
                    <?= $isEN ? 'Showing' : 'แสดง' ?> <b><?= $start + 1 ?></b> <?= $isEN ? 'to' : 'ถึง' ?>
                    <b><?= min($total_rows, $start + $limit) ?></b> <?= $isEN ? 'of' : 'จากทั้งหมด' ?>
                    <b><?= number_format($total_rows) ?></b> <?= $isEN ? 'records' : 'รายการ' ?>
                </div>

                <?php
                if ($total_pages > 1) {
                    echo render_pagination_html($page, (int) $total_pages, pagination_href_prefix($_GET));
                }
                ?>
            </div>
        <?php endif; ?>

    </div>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
