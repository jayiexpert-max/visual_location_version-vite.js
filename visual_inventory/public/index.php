<?php
// index.php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once("../config/cpk_service.php");

$isAdmin = role_is_admin();
$isWarehouseStaff = role_is_warehouse_staff();
$canReceiveInbound = role_can_receive_inbound();
$canWarehouseIssue = role_can_warehouse_issue();
$page_title = __('dashboard_title');
$page_icon = 'fa-warehouse';
$is_dashboard = true;
$show_home = false;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title><?= __('dashboard_title') ?></title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
    <link href="assets/factory.css?v=20260611" rel="stylesheet">
    <link href="assets/dashboard.css?v=20260621" rel="stylesheet">
</head>

<body class="factory-app factory-dashboard">

<?php require __DIR__ . '/includes/layout_header.php'; ?>

<main class="fx-main">
    <div class="fx-dashboard-intro">
        <h2><?= __('system_desc') ?></h2>
        <div class="fx-dashboard-clock" id="currentDateTime">
            <i class="fas fa-calendar-alt"></i>
            <span id="displayDate"><?= date('d F Y') ?></span>
            <span style="color:#cbd5e1;">|</span>
            <i class="fas fa-clock"></i>
            <span id="displayTime">00:00:00</span>
        </div>
    </div>

        <!-- Quick Stats (Optional Placeholder for now, can be dynamic later) -->
        <div class="stats-grid">
            <?php
            // Simple counts for stats
            $countProd = $condb->query("SELECT COUNT(*) c FROM products")->fetch_assoc()['c'];
            $countBox = $condb->query("SELECT COUNT(*) c FROM boxes")->fetch_assoc()['c'];
            // $countLog  = $condb->query("SELECT COUNT(*) c FROM stock_logs WHERE created_at >= CURDATE()")->fetch_assoc()['c'];
            ?>
            <div class="stat-card">
                <div class="stat-icon stat-icon--products"><i class="fas fa-boxes"></i></div>
                <div class="stat-info">
                    <h3><?= number_format($countProd) ?></h3>
                    <p><?= __('stats_products') ?></p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon stat-icon--boxes"><i class="fas fa-cubes"></i></div>
                <div class="stat-info">
                    <h3><?= number_format($countBox) ?></h3>
                    <p><?= __('stats_boxes') ?></p>
                </div>
            </div>
            <?php if ($canWarehouseIssue): ?>
            <a href="picklist_issue" class="stat-card stat-card-link" id="picklistPendingStat" hidden>
                <div class="stat-icon stat-icon--picklist"><i class="fas fa-list-check"></i></div>
                <div class="stat-info">
                    <h3 id="picklistPendingCount">0</h3>
                    <p><?= __('logout') == 'Logout' ? 'Picklists pending issue' : 'Picklist รอจ่าย' ?></p>
                </div>
            </a>
            <?php endif; ?>
        </div>

        <h2 class="section-title"><?= __('main_menu') ?></h2>

        <div class="modules-grid">
            <!-- 1. Withdraw -->
            <!-- <a href="withdraw_product" class="module-card"
                style="--hover-color:#ef4444; --icon-bg:#fee2e2; --icon-color:#ef4444;">
                <div class="module-icon"><i class="fas fa-dolly"></i></div>
                <div class="module-title"><?= __('mod_withdraw_puid') ?></div>
                <div class="module-desc"><?= __('mod_withdraw_puid_desc') ?></div>
                <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
            </a> -->

            <!-- 5. Search Product (Slot Focus) -->
            <a href="search_product" class="module-card"
                style="--hover-color:#f59e0b; --icon-bg:#ffedd5; --icon-color:#d97706;">
                <div class="module-icon"><i class="fas fa-search"></i></div>
                <div class="module-title"><?= __('mod_search_box') ?></div>
                <div class="module-desc"><?= __('mod_search_box_desc') ?></div>
                <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
            </a>

            <?php if ($canReceiveInbound): ?>
                <a href="show_api_data?list=1" class="module-card"
                    style="--hover-color:#10b981; --icon-bg:#dcfce7; --icon-color:#10b981;">
                    <div class="module-icon"><i class="fas fa-file-invoice"></i></div>
                    <div class="module-title"><?= __('mod_show_api_data') ?></div>
                    <div class="module-desc"><?= __('mod_show_api_data_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
                </a>
                <a href="add_stock" class="module-card"
                    style="--hover-color:#10b981; --icon-bg:#dcfce7; --icon-color:#10b981;">
                    <div class="module-icon"><i class="fas fa-plus-circle"></i></div>
                    <div class="module-title"><?= __('mod_add_stock') ?></div>
                    <div class="module-desc"><?= __('mod_add_stock_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
                </a>
            <?php endif; ?>

            <?php if ($canWarehouseIssue): ?>
                <a href="<?= htmlspecialchars(cpk_hana_picklist_report_url()) ?>" target="_blank" rel="noopener noreferrer"
                    class="module-card"
                    style="--hover-color:#7c3aed; --icon-bg:#ede9fe; --icon-color:#6d28d9;">
                    <div class="module-icon"><i class="fas fa-clipboard-list"></i></div>
                    <div class="module-title"><?= __('mod_hana_picklist') ?></div>
                    <div class="module-desc"><?= __('mod_hana_picklist_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-external-link-alt"></i></div>
                </a>
                <a href="picklist_issue" class="module-card" id="picklistModuleCard"
                    style="--hover-color:#ea580c; --icon-bg:#ffedd5; --icon-color:#c2410c;">
                    <span class="module-badge" id="picklistModuleBadge" hidden aria-label="Pending picklists">0</span>
                    <div class="module-icon"><i class="fas fa-list-check"></i></div>
                    <div class="module-title"><?= __('mod_picklist_issue') ?></div>
                    <div class="module-desc"><?= __('mod_picklist_issue_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
                </a>
            <?php endif; ?>

            <?php if ($isWarehouseStaff): ?>
                <a href="booking_out_puid" class="module-card"
                    style="--hover-color:#0891b2; --icon-bg:#cffafe; --icon-color:#0e7490;">
                    <div class="module-icon"><i class="fas fa-dolly"></i></div>
                    <div class="module-title"><?= __('mod_booking_out') ?></div>
                    <div class="module-desc"><?= __('mod_booking_out_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
                </a>
                <a href="wo_material_calc" class="module-card"
                    style="--hover-color:#0284c7; --icon-bg:#e0f2fe; --icon-color:#0284c7;">
                    <div class="module-icon"><i class="fas fa-calculator"></i></div>
                    <div class="module-title"><?= __('mod_wo_material_calc') ?></div>
                    <div class="module-desc"><?= __('mod_wo_material_calc_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
                </a>
            <?php endif; ?>

            <!-- 3. Dashboard Rack -->
            <a href="dashboard_rack" class="module-card"
                style="--hover-color:#3b82f6; --icon-bg:#dbeafe; --icon-color:#2563eb;">
                <div class="module-icon"><i class="fas fa-th"></i></div>
                <div class="module-title"><?= __('mod_rack_overview') ?></div>
                <div class="module-desc"><?= __('mod_rack_overview_desc') ?></div>
                <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
            </a>

            <?php if ($isAdmin): ?>
                <!-- 3.5 TV Display -->
                <a href="tv_display" target="_blank" class="module-card"
                    style="--hover-color:#0ea5e9; --icon-bg:#e0f2fe; --icon-color:#0ea5e9;">
                    <div class="module-icon"><i class="fas fa-tv"></i></div>
                    <div class="module-title"><?= __('mod_tv_display') ?></div>
                    <div class="module-desc"><?= __('mod_tv_display_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-external-link-alt"></i></div>
                </a>

                <!-- 3.8 3D Layout -->
                <a href="layout_3d" target="_blank" class="module-card"
                    style="--hover-color:#0891b2; --icon-bg:#cffafe; --icon-color:#0e7490;">
                    <div class="module-icon"><i class="fas fa-cubes"></i></div>
                    <div class="module-title"><?= __('mod_3d_layout') ?></div>
                    <div class="module-desc"><?= __('mod_3d_layout_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-external-link-alt"></i></div>
                </a>
            <?php endif; ?>

            <!-- 3.9 Abdul AI Assistant -->
            <a href="abdul_ai/" target="_blank" rel="noopener noreferrer" class="module-card"
                style="--hover-color:#2563eb; --icon-bg:#eff6ff; --icon-color:#1d4ed8;">
                <div class="module-icon"><i class="fas fa-robot"></i></div>
                <div class="module-title"><?= __('mod_abdul_ai') ?></div>
                <div class="module-desc"><?= __('mod_abdul_ai_desc') ?></div>
                <div class="card-action"><?= __('enter') ?> <i class="fas fa-external-link-alt"></i></div>
            </a>

            <!-- 4. Reports -->
            <a href="report_stock" class="module-card"
                style="--hover-color:#2563eb; --icon-bg:#dbeafe; --icon-color:#1d4ed8;">
                <div class="module-icon"><i class="fas fa-clipboard-list"></i></div>
                <div class="module-title"><?= __('mod_stock_report') ?></div>
                <div class="module-desc"><?= __('mod_stock_report_desc') ?></div>
                <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
            </a>

            <?php if ($isWarehouseStaff): ?>
            <a href="check_expiration" class="module-card"
                style="--hover-color:#f97316; --icon-bg:#ffedd5; --icon-color:#c2410c;">
                <div class="module-icon"><i class="fas fa-hourglass-half"></i></div>
                <div class="module-title"><?= __('mod_exp_check') ?></div>
                <div class="module-desc"><?= __('mod_exp_check_desc') ?></div>
                <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
            </a>
            <?php endif; ?>

            <!-- 6.5 Materials Management -->
            <?php if ($isAdmin): ?>
                <a href="add_material" class="module-card"
                    style="--hover-color:#ec4899; --icon-bg:#fce7f3; --icon-color:#db2777;">
                    <div class="module-icon"><i class="fas fa-boxes"></i></div>
                    <div class="module-title"><?= __('mod_bom_manage') ?></div>
                    <div class="module-desc"><?= __('mod_bom_manage_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
                </a>
            <?php endif; ?>

            <!-- 6.6 Production Calculator -->
            <!-- <a href="production_calculator" class="module-card"
                style="--hover-color:#0ea5e9; --icon-bg:#e0f2fe; --icon-color:#0284c7;">
                <div class="module-icon"><i class="fas fa-calculator"></i></div>
                <div class="module-title"><?= __('mod_prod_calc') ?></div>
                <div class="module-desc"><?= __('mod_prod_calc_desc') ?></div>
                <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
            </a> -->

            <!-- 7. Users -->
            <?php if ($isAdmin): ?>
                <a href="manage_users" class="module-card"
                    style="--hover-color:#0f172a; --icon-bg:#f1f5f9; --icon-color:#334155;">
                    <div class="module-icon"><i class="fas fa-users-cog"></i></div>
                    <div class="module-title"><?= __('mod_manage_users') ?></div>
                    <div class="module-desc"><?= __('mod_manage_users_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
                </a>
            <?php endif; ?>

            <!-- 7.5 View Inventory Receive -->
            <!-- <a href="view_inventory_receive" class="module-card"
                style="--hover-color:#14b8a6; --icon-bg:#ccfbf1; --icon-color:#0d9488;">
                <div class="module-icon"><i class="fas fa-warehouse"></i></div>
                <div class="module-title"><?= __('mod_inv_list') ?></div>
                <div class="module-desc"><?= __('mod_inv_list_desc') ?></div>
                <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
            </a> -->


            <?php if ($isAdmin): ?>
                <!-- 7.5 View Inventory Receive -->
                <a href="view_inventory_receive" class="module-card"
                    style="--hover-color:#14b8a6; --icon-bg:#ccfbf1; --icon-color:#0d9488;">
                    <div class="module-icon"><i class="fas fa-warehouse"></i></div>
                    <div class="module-title"><?= __('mod_inv_list') ?></div>
                    <div class="module-desc"><?= __('mod_inv_list_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
                </a>

                <!-- 8. Admin -->
                <a href="admin" class="module-card" style="--hover-color:#0f172a; --icon-bg:#f1f5f9; --icon-color:#0f172a;">
                    <div class="module-icon"><i class="fas fa-cogs"></i></div>
                    <div class="module-title"><?= __('mod_admin_settings') ?></div>
                    <div class="module-desc"><?= __('mod_admin_settings_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
                </a>

                <!-- UI Preview -->
                <a href="ui_preview" class="module-card"
                    style="--hover-color:#64748b; --icon-bg:#f1f5f9; --icon-color:#475569;">
                    <div class="module-icon"><i class="fas fa-palette"></i></div>
                    <div class="module-title"><?= __('mod_ui_preview') ?></div>
                    <div class="module-desc"><?= __('mod_ui_preview_desc') ?></div>
                    <div class="card-action"><?= __('enter') ?> <i class="fas fa-chevron-right"></i></div>
                </a>
            <?php endif; ?>

        </div>
</main>

<?php require __DIR__ . '/includes/layout_footer.php'; ?>

    <script src="assets/picklist-notify.js?v=20260609"></script>
    <script>
        function updateClock() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('th-TH', {
                hour12: false
            });
            document.getElementById('displayTime').innerText = timeStr;
        }
        setInterval(updateClock, 1000);
        updateClock();

        <?php if ($canWarehouseIssue): ?>
        (function loadPicklistPendingCount() {
            var statCard = document.getElementById('picklistPendingStat');
            var statCount = document.getElementById('picklistPendingCount');
            var moduleBadge = document.getElementById('picklistModuleBadge');
            if (!statCard || !statCount) return;
            var isEN = <?= json_encode(($_SESSION['lang'] ?? 'th') === 'en') ?>;
            var picklistIssueState = {};

            function normalizeList(data) {
                if (typeof PicklistNotify !== 'undefined' && PicklistNotify.normalizeList) {
                    return PicklistNotify.normalizeList(data);
                }
                if (!data) return [];
                if (Array.isArray(data)) return data;
                if (Array.isArray(data.Picklists)) return data.Picklists;
                if (Array.isArray(data.OpenPicklists)) return data.OpenPicklists;
                if (Array.isArray(data.Items)) return data.Items;
                if (Array.isArray(data.List)) return data.List;
                return [];
            }

            function prunePicklistIssueState(list) {
                var ids = {};
                (list || []).forEach(function (row) {
                    if (typeof PicklistNotify === 'undefined') return;
                    var id = PicklistNotify.picklistIdFromRow(row);
                    if (id) ids[id] = true;
                });
                Object.keys(picklistIssueState).forEach(function (id) {
                    if (!ids[id]) delete picklistIssueState[id];
                });
            }

            function pendingCount(list) {
                if (typeof PicklistNotify !== 'undefined' && PicklistNotify.countPending) {
                    return PicklistNotify.countPending(list, picklistIssueState);
                }
                return list.length;
            }

            function showCount(n) {
                statCount.textContent = n;
                if (n > 0) {
                    statCard.hidden = false;
                    if (moduleBadge) {
                        moduleBadge.textContent = n;
                        moduleBadge.hidden = false;
                    }
                } else {
                    statCard.hidden = true;
                    if (moduleBadge) moduleBadge.hidden = true;
                }
            }

            function enrichPicklistStates(list) {
                if (typeof PicklistNotify === 'undefined' || !PicklistNotify.enrichIssueStates) {
                    return Promise.resolve();
                }
                return PicklistNotify.enrichIssueStates(list, picklistIssueState, {
                    concurrency: 4,
                    fetchDetail: function (id) {
                        return fetch('api_gateway.php?call=cpk/get_picklist_detail.php', {
                            method: 'POST',
                            credentials: 'same-origin',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ PicklistID: id, RequiredOnly: false })
                        })
                            .then(function (r) { return r.json(); })
                            .then(function (res) {
                                if (res.status !== 'success') {
                                    throw new Error(res.message || 'detail failed');
                                }
                                return PicklistNotify.normalizeDetailItems(res.data);
                            });
                    }
                });
            }

            function handlePicklists(data) {
                var list = normalizeList(data);
                prunePicklistIssueState(list);
                enrichPicklistStates(list).then(function () {
                    showCount(pendingCount(list));
                    if (typeof PicklistNotify === 'undefined') {
                        return;
                    }
                    var newIds = PicklistNotify.detectNew(list, picklistIssueState);
                    if (newIds.length > 0) {
                        PicklistNotify.alertNew(newIds, isEN);
                    }
                });
            }

            if (typeof PicklistNotify !== 'undefined') {
                PicklistNotify.bindUnlock();
            }

            fetch('api_gateway.php?call=cpk/get_open_picklists.php', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: '{}'
            })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    if (res.status !== 'success') return;
                    handlePicklists(res.data);
                })
                .catch(function () { /* CPK offline — keep hidden */ });

            setInterval(function () {
                fetch('api_gateway.php?call=cpk/get_open_picklists.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}'
                })
                    .then(function (r) { return r.json(); })
                    .then(function (res) {
                        if (res.status === 'success') {
                            handlePicklists(res.data);
                        }
                    })
                    .catch(function () {});
            }, 60000);
        })();
        <?php endif; ?>
    </script>
</body>

</html>