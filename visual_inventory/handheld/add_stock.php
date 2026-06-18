<?php
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/handheld.php';

if (!role_can_receive_inbound()) {
    http_response_code(403);
    $accessDenied = true;
} else {
    $accessDenied = false;
}

$message = $_SESSION['handheld_add_flash']['message'] ?? '';
$message_type = $_SESSION['handheld_add_flash']['type'] ?? '';
unset($_SESSION['handheld_add_flash']);

if (!$accessDenied && $_SERVER['REQUEST_METHOD'] === 'POST') {
    define('HANDHELD_POST', true);
    $oldCwd = getcwd();
    ob_start();
    chdir(__DIR__ . '/../public');
    include __DIR__ . '/../public/add_stock.php';
    chdir($oldCwd);
    ob_end_clean();

    $_SESSION['handheld_add_flash'] = [
        'message' => $message ?: 'Add stock request completed.',
        'type' => $message_type ?: 'success',
    ];
    header('Location: add_stock');
    exit;
}

$hh_title = 'Add Stock | Handheld';
?>
<!DOCTYPE html>
<html lang="en">

<head>
<?php require __DIR__ . '/includes/head.php'; ?>
</head>

<body class="handheld-app" data-api-base="<?= htmlspecialchars(handheld_api_base(), ENT_QUOTES, 'UTF-8') ?>">
    <main class="handheld-main">
        <?php
        $bar_title = 'Add Stock';
        $bar_show_logout = true;
        require __DIR__ . '/includes/bar.php';
        ?>

        <?php if ($accessDenied): ?>
            <section class="fx-alert fx-alert-warning">Access denied. Add Stock requires admin or material_prep permission.</section>
        <?php else: ?>
            <?php if ($message): ?>
                <section class="fx-alert <?= $message_type === 'success' ? 'fx-alert-success' : 'fx-alert-warning' ?>">
                    <?= $message ?>
                </section>
            <?php endif; ?>

            <section id="dynamicMessage" class="fx-alert" hidden></section>

            <form method="POST" id="addInventoryForm" class="handheld-form" data-mode="add" autocomplete="off">
                <label for="puid_input">Scan PUID</label>
                <input type="text" id="puid_input" name="PUID" class="scan-field" required inputmode="text" autocomplete="off" autofocus>

                <div class="hh-actions">
                    <button type="button" class="fx-btn fx-btn-secondary" data-fetch-add>Get Data</button>
                </div>

                <div class="hh-qty-remain" id="qtyRemainSection">
                    <label for="qty_remain_input">Qty Remain (actual count)</label>
                    <input type="number" name="QtyRemain" id="qty_remain_input" class="hh-qty-edit"
                        placeholder="สแกน PUID แล้วกด Get Data" min="1" step="1" inputmode="numeric"
                        autocomplete="off" disabled>
                </div>

                <div class="fx-handheld-summary" id="stockSummary" hidden>
                    <div><span>Part</span><strong id="summaryPart">-</strong></div>
                    <div><span>IM</span><strong id="summaryIm">-</strong></div>
                    <div><span>Full Qty</span><strong id="summaryFullQty">-</strong></div>
                    <div><span>Location</span><strong id="summaryLocation">-</strong></div>
                </div>

                <input type="hidden" name="ReceiveDate" value="<?= date('Y-m-d\TH:i') ?>">
                <input type="hidden" name="HanaPart" id="hanapart_input">
                <input type="hidden" name="IM" id="im_display">
                <input type="hidden" name="Qty" id="qty_display">
                <input type="hidden" name="Customer" id="customer_input">
                <input type="hidden" name="Description" id="description_input">
                <input type="hidden" name="MnfPartNo" id="mnf_part_no_input">
                <input type="hidden" name="LotNo" id="lot_no_input">
                <input type="hidden" name="DateCode" id="date_code_input">
                <input type="hidden" name="BinSize" id="bin_size_input">
                <input type="hidden" name="StatusName" id="status_name_input" value="Available">
                <input type="hidden" name="McID" id="mc_id_input">
                <input type="hidden" name="MachineName" id="machine_name_input">
                <input type="hidden" name="ExpirationDate" id="expiration_date_input">
                <input type="hidden" name="OldIM" id="old_im_input">
                <input type="hidden" name="Remark" id="remark_input">
                <input type="hidden" name="ExpireDate_RoomTemp" id="expire_date_room_temp_input">
                <input type="hidden" name="slot_id" id="slot_id_input">
                <input type="hidden" name="ReservationNo" id="reservation_no_input">
                <input type="hidden" name="Loc_Shelf" id="loc_shelf_input">
                <input type="hidden" name="Loc_Level" id="loc_level_input">
                <input type="hidden" name="Loc_Box" id="loc_box_input">
                <input type="hidden" name="Loc_Slot" id="loc_slot_input">

                <button type="submit" class="fx-btn fx-btn-primary">Confirm Receive</button>
            </form>
        <?php endif; ?>
    </main>

    <script defer src="<?= htmlspecialchars(handheld_asset('handheld-idle.js')) ?>"></script>
    <script defer src="<?= htmlspecialchars(handheld_asset('handheld.js')) ?>"></script>
</body>

</html>
