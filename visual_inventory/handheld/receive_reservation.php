<?php
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/handheld.php';

if (!role_can_receive_inbound()) {
    http_response_code(403);
    $accessDenied = true;
} else {
    $accessDenied = false;
}

$hh_title = 'Receive Reservation | Handheld';
?>
<!DOCTYPE html>
<html lang="en">

<head>
<?php require __DIR__ . '/includes/head.php'; ?>
</head>

<body class="handheld-app"
    data-api-base="<?= htmlspecialchars(handheld_api_base(), ENT_QUOTES, 'UTF-8') ?>"
    data-username="<?= htmlspecialchars($_SESSION['username'] ?? '', ENT_QUOTES, 'UTF-8') ?>">
    <main class="handheld-main">
        <?php
        $bar_title = 'Receive RES';
        $bar_show_logout = true;
        require __DIR__ . '/includes/bar.php';
        ?>

        <?php if ($accessDenied): ?>
            <section class="fx-alert fx-alert-warning">Access denied. Reservation receive requires admin or material_prep permission.</section>
        <?php else: ?>
            <section id="dynamicMessage" class="fx-alert fx-alert-info" role="status">
                Scan Reservation No. from CPK…
            </section>

            <form id="reservationReceiveForm" class="handheld-form" autocomplete="off">
                <label for="reservation_input">Scan Reservation No.</label>
                <input type="text" id="reservation_input" class="scan-field" required inputmode="numeric"
                    autocomplete="off" autofocus placeholder="e.g. 1234567890">

                <button type="button" class="fx-btn fx-btn-secondary" id="btnLoadReservation">
                    Load Reservation
                </button>

                <section id="reservationDetailView" hidden>
                    <div class="hh-picklist-toolbar">
                        <p class="hh-picklist-heading" id="reservationHeading">RES —</p>
                        <button type="button" class="fx-btn fx-btn-secondary fx-btn--inline" id="btnRefreshReservation">
                            Refresh
                        </button>
                    </div>
                    <p class="hh-picklist-hint" id="reservationMeta">—</p>

                    <div id="reservationLines" class="hh-picklist-lines"></div>

                    <label for="puid_input">Scan PUID</label>
                    <input type="text" id="puid_input" class="scan-field" inputmode="text" autocomplete="off" disabled>

                    <div class="fx-handheld-summary" id="stockSummary" hidden>
                        <div><span>RES</span><strong id="summaryReservation">-</strong></div>
                        <div><span>Status</span><strong id="summaryReservationStatus">-</strong></div>
                        <div><span>PUID</span><strong id="summaryPuid">-</strong></div>
                        <div><span>Part</span><strong id="summaryPart">-</strong></div>
                        <div><span>IM</span><strong id="summaryIm">-</strong></div>
                        <div><span>Qty</span><strong id="summaryQty">0</strong></div>
                        <div><span>Location</span><strong id="summaryLocation">-</strong></div>
                    </div>

                    <button type="submit" class="fx-btn fx-btn-primary" id="btnConfirmReceive" disabled>
                        Confirm Receive
                    </button>
                </section>
            </form>
        <?php endif; ?>
    </main>

    <script defer src="<?= htmlspecialchars(handheld_asset('handheld-idle.js')) ?>"></script>
    <script defer src="<?= htmlspecialchars(handheld_asset('handheld-highlight.js')) ?>"></script>
    <script defer src="<?= htmlspecialchars(handheld_asset('handheld-reservation.js')) ?>"></script>
</body>

</html>
