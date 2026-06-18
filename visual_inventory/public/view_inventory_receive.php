<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once("../config/helpers.php");

// Pagination settings
$limit = 20;
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$offset = ($page - 1) * $limit;

// Search Logic
$where = "WHERE 1=1";

if (!empty($_GET['puid'])) {
    $term = $condb->real_escape_string(trim($_GET['puid']));
    $where .= " AND PUID LIKE '%$term%'";
}
if (!empty($_GET['im'])) {
    $term = $condb->real_escape_string(trim($_GET['im']));
    $where .= " AND IM LIKE '%$term%'";
}
if (!empty($_GET['hanapart'])) {
    $term = $condb->real_escape_string(trim($_GET['hanapart']));
    $where .= " AND HanaPart LIKE '%$term%'";
}
if (!empty($_GET['datecode'])) {
    $term = $condb->real_escape_string(trim($_GET['datecode']));
    $where .= " AND DateCode LIKE '%$term%'";
}
if (!empty($_GET['exp_date'])) {
    $term = $condb->real_escape_string($_GET['exp_date']);
    $where .= " AND DATE(ExpirationDate) = '$term'";
}

// Count Total
$countSql = "SELECT COUNT(*) as total FROM inventory_receive $where";
$total_rows = $condb->query($countSql)->fetch_assoc()['total'];
$total_pages = ceil($total_rows / $limit);

// Fetch Data
$sql = "SELECT * FROM inventory_receive $where ORDER BY ReceiveDate DESC LIMIT $offset, $limit";
$result = $condb->query($sql);

// Get all column names dynamically
$fields = [];
if ($result) {
    while ($field = $result->fetch_field()) {
        if ($field->name !== 'id') { // Exclude ID as we show row number
            $fields[] = $field->name;
        }
    }
}

// Export Logic
if (isset($_GET['export']) && $_GET['export'] === 'excel') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=Inventory_Data_All_' . date('Y-m-d') . '.csv');
    $output = fopen('php://output', 'w');
    fputs($output, "\xEF\xBB\xBF"); // BOM for UTF-8 in Excel

    // Fetch All Columns Logic for Export
    $sqlExport = "SELECT * FROM inventory_receive $where ORDER BY ReceiveDate DESC";
    $resExport = $condb->query($sqlExport);

    if ($resExport->num_rows > 0) {
        $firstRow = $resExport->fetch_assoc();
        $expFields = array_keys($firstRow);
        fputcsv($output, $expFields);
        fputcsv($output, $firstRow);
        while ($row = $resExport->fetch_assoc()) {
            fputcsv($output, $row);
        }
    }
    fclose($output);
    exit;
}

$isEN = (($_SESSION['lang'] ?? 'th') === 'en');
$page_title = __('inventory_report');
$page_icon = 'fa-clipboard-list';
$show_home = true;
$extra_head_links = [
    '<link rel="stylesheet" href="assets/factory.css?v=20260611">',
    '<link rel="stylesheet" href="assets/pages-common.css?v=20260607">',
    '<link rel="stylesheet" href="assets/pages/view-inventory-receive.css?v=20260610">',
];
require_once __DIR__ . '/includes/head.php';
?>
    </head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main">
    <div class="vir-container">
        <p class="vir-intro">
            <?= $isEN
                ? 'Search and export received inventory records from the warehouse database.'
                : 'ค้นหาและส่งออกรายการรับเข้าคลังจากฐานข้อมูลในระบบ' ?>
        </p>
        <?php
        $q = $_GET;
        unset($q['page'], $q['export']);
        $qs = http_build_query($q);
        $hasFilter = !empty($_GET['hanapart']) || !empty($_GET['puid']) || !empty($_GET['im'])
            || !empty($_GET['datecode']) || !empty($_GET['exp_date']);
        ?>
        <form class="vir-filter" method="GET">
            <div class="vir-filter-grid">
                <div class="vir-filter-field">
                    <label class="fx-field-label" for="virHanaPart">HanaPart</label>
                    <input type="text" class="vir-input" id="virHanaPart" name="hanapart"
                        value="<?= htmlspecialchars($_GET['hanapart'] ?? '') ?>"
                        placeholder="<?= $isEN ? 'Part number…' : 'รหัสพาร์ท…' ?>">
                </div>
                <div class="vir-filter-field">
                    <label class="fx-field-label" for="virPuid">PUID</label>
                    <input type="text" class="vir-input" id="virPuid" name="puid"
                        value="<?= htmlspecialchars($_GET['puid'] ?? '') ?>"
                        placeholder="<?= $isEN ? 'Scan PUID…' : 'สแกน PUID…' ?>"
                        oninput="this.value = this.value.toUpperCase().replace(/^VL/, '');">
                </div>
                <div class="vir-filter-field">
                    <label class="fx-field-label" for="virIm">IM</label>
                    <input type="text" class="vir-input" id="virIm" name="im"
                        value="<?= htmlspecialchars($_GET['im'] ?? '') ?>"
                        placeholder="<?= $isEN ? 'IM code…' : 'รหัส IM…' ?>">
                </div>
                <div class="vir-filter-field">
                    <label class="fx-field-label" for="virDateCode">DateCode</label>
                    <input type="text" class="vir-input" id="virDateCode" name="datecode"
                        value="<?= htmlspecialchars($_GET['datecode'] ?? '') ?>"
                        placeholder="<?= $isEN ? 'Date code…' : 'DateCode…' ?>">
                </div>
                <div class="vir-filter-field vir-filter-field--date">
                    <label class="fx-field-label" for="virExpDate"><?= $isEN ? 'Expiration date' : 'วันหมดอายุ' ?></label>
                    <input type="date" class="vir-input" id="virExpDate" name="exp_date"
                        value="<?= htmlspecialchars($_GET['exp_date'] ?? '') ?>">
                </div>
                <div class="vir-filter-actions">
                    <div class="vir-filter-actions__group">
                        <button type="submit" class="fx-btn fx-btn-accent">
                            <i class="fas fa-search" aria-hidden="true"></i> <?= __('search_btn') ?>
                        </button>
                        <?php if ($hasFilter): ?>
                            <a href="view_inventory_receive" class="fx-btn fx-btn-secondary"><?= $isEN ? 'Clear' : 'ล้างค่า' ?></a>
                        <?php endif; ?>
                    </div>
                    <a href="?export=excel&<?= $qs ?>" class="fx-btn fx-btn-secondary vir-btn-export">
                        <i class="fas fa-file-excel" aria-hidden="true"></i>
                        <?= $isEN ? 'Export Excel' : 'ส่งออก Excel' ?>
                    </a>
                </div>
            </div>
        </form>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="text-align:center; width:50px;">#</th>
                        <?php foreach ($fields as $field): ?>
                            <th><?= htmlspecialchars($field) ?></th>
                        <?php endforeach; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $rowNum = $offset + 1;
                    if ($result->num_rows > 0): ?>
                        <?php while ($row = $result->fetch_assoc()): ?>
                            <tr>
                                <td style="text-align:center; color:var(--text-light);"><?= $rowNum++ ?></td>
                                <?php foreach ($fields as $field): ?>
                                    <td class="col-<?= $field ?>">
                                        <?= htmlspecialchars($row[$field] ?? '') ?>
                                    </td>
                                <?php endforeach; ?>
                            </tr>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="<?= count($fields) + 1 ?>" style="text-align:center; padding:40px; color:#94a3b8;">
                                <?= __('no_data') ?>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
        echo render_pagination_html($page, (int) $total_pages, pagination_href_prefix($_GET));
        ?>
    </div>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
