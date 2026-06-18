<?php
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/handheld.php';

$operator = htmlspecialchars($_SESSION['username'] ?? '', ENT_QUOTES, 'UTF-8');
$hhIsEn = (($_SESSION['lang'] ?? 'th') === 'en');
$hh_title = $hhIsEn ? 'Picklist Issue | Handheld' : 'จ่าย Picklist | Handheld';
?>
<!DOCTYPE html>
<html lang="<?= $hhIsEn ? 'en' : 'th' ?>">

<head>
<?php require __DIR__ . '/includes/head.php'; ?>
</head>

<body class="handheld-app"
    data-api-base="<?= htmlspecialchars(handheld_api_base(), ENT_QUOTES, 'UTF-8') ?>"
    data-operator="<?= $operator ?>"
    data-is-en="<?= $hhIsEn ? '1' : '0' ?>">
    <main class="handheld-main">
        <?php
        $bar_title = 'Picklist Issue';
        $bar_show_logout = true;
        require __DIR__ . '/includes/bar.php';
        ?>

        <section id="picklistAlert" class="fx-alert fx-alert-info" role="status">
            Loading open picklists from CPK…
        </section>

        <section id="picklistListView" class="hh-picklist-view">
            <div class="hh-picklist-toolbar">
                <p class="hh-picklist-heading">
                    Picklists pending issue (<span id="openPicklistCount">—</span>)
                </p>
                <button type="button" class="fx-btn fx-btn-secondary fx-btn--inline" id="btnRefreshPicklists">
                    Refresh
                </button>
            </div>
            <div id="picklistCards" class="hh-picklist-cards">
                <p class="hh-picklist-empty">Loading…</p>
            </div>
        </section>

        <section id="picklistIssueView" class="hh-picklist-view" hidden>
            <div class="hh-picklist-toolbar">
                <button type="button" class="fx-btn fx-btn-secondary fx-btn--inline" id="btnBackToList">&larr; List</button>
                <button type="button" class="fx-btn fx-btn-danger fx-btn--inline" id="btnClosePicklist">
                    Close
                </button>
            </div>

            <p class="hh-picklist-selected" id="selectedPicklistLabel">—</p>
            <p class="hh-picklist-hint">
                Lines from CPK GetPicklistDetail. Reel_No = issued PUID.
            </p>

            <section id="issueAlert" class="fx-alert" hidden role="status"></section>
            <section id="scanCompleteMsg" class="fx-alert fx-alert-success" hidden role="status"></section>

            <div id="scanIssueSection">
                <label for="puidInput">Scan PUID to issue</label>
                <input type="text" id="puidInput" class="scan-field" placeholder="Scan PUID…" autocomplete="off" inputmode="text">
                <button type="button" class="fx-btn fx-btn-primary" id="btnIssue">Issue</button>
            </div>

            <div id="detailCards" class="hh-picklist-lines">
                <p class="hh-picklist-empty">Loading…</p>
            </div>
        </section>
    </main>

    <div class="hh-modal" id="closePicklistModal" hidden>
        <div class="hh-modal-dialog" role="dialog" aria-labelledby="closePicklistTitle">
            <h3 id="closePicklistTitle">Confirm close picklist</h3>
            <p id="closePicklistMessage">—</p>
            <label for="closePicklistKitsNote">Kitting note (optional, max 200)</label>
            <textarea id="closePicklistKitsNote" maxlength="200" rows="3"
                placeholder="e.g. Closed after manual review"></textarea>
            <div class="hh-modal-actions">
                <button type="button" class="fx-btn fx-btn-secondary" id="btnClosePicklistCancel">Cancel</button>
                <button type="button" class="fx-btn fx-btn-danger" id="btnClosePicklistConfirm">Confirm close</button>
            </div>
        </div>
    </div>

    <script defer src="<?= htmlspecialchars(rtrim(handheld_api_base(), '/') . '/assets/picklist-issue-i18n.js') ?>"></script>
    <script defer src="<?= htmlspecialchars(rtrim(handheld_api_base(), '/') . '/assets/picklist-notify.js') ?>"></script>
    <script defer src="<?= htmlspecialchars(handheld_asset('handheld-idle.js')) ?>"></script>
    <script defer src="<?= htmlspecialchars(handheld_asset('handheld-highlight.js')) ?>"></script>
    <script defer src="<?= htmlspecialchars(handheld_asset('handheld-picklist.js')) ?>"></script>
</body>

</html>
