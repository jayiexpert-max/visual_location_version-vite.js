<?php
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/handheld.php';

$hh_title = 'Handheld Inventory';
?>
<!DOCTYPE html>
<html lang="en">

<head>
<?php require __DIR__ . '/includes/head.php'; ?>
</head>

<body class="handheld-app">
    <main class="handheld-main">
        <?php
        $bar_title = 'Handheld Inventory';
        $bar_kicker = 'KEYENCE BT-A500';
        $bar_menu = true;
        require __DIR__ . '/includes/bar.php';
        ?>

        <nav class="hh-menu-grid" aria-label="Handheld actions">
            <?php if (role_can_receive_inbound()): ?>
                <a class="hh-menu-button hh-add" href="add_stock">
                    <span class="hh-button-title">Add Stock</span>
                    <span class="hh-button-subtitle">Scan location and material</span>
                </a>
            <?php endif; ?>

            <a class="hh-menu-button hh-picklist" href="picklist_issue">
                <span class="hh-button-title">Picklist Issue</span>
                <span class="hh-button-subtitle">Open picklists from CPK, scan PUID</span>
            </a>

            <?php if (role_can_receive_inbound()): ?>
                <a class="hh-menu-button hh-reserve" href="receive_reservation">
                    <span class="hh-button-title">Receive Reservation</span>
                    <span class="hh-button-subtitle">CPK RES — scan PUID to receive</span>
                </a>
            <?php endif; ?>

            <a class="hh-menu-button hh-logout-card" href="logout" aria-label="Logout" onclick="return confirm('Logout? / ออกจากระบบ?')">
                <span class="hh-button-title">Logout</span>
            </a>
        </nav>
    </main>
    <script defer src="<?= htmlspecialchars(handheld_asset('handheld-idle.js')) ?>"></script>
</body>

</html>
