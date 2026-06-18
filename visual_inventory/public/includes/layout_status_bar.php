<?php
/**
 * Shop-floor status bar — optional IDs for JS: apiStatusDot, cpkStatusDot, etc.
 */
$show_cpk_status = $show_cpk_status ?? true;
?>
<div class="fx-statusbar" id="fxStatusBar">
    <div class="fx-status is-pending" id="apiStatusWrap">
        <span class="fx-status__dot" id="apiStatusDot"></span>
        <span id="apiStatusText"><?= __('logout') === 'Logout' ? 'Checking PDService...' : 'กำลังตรวจสอบ PDService...' ?></span>
    </div>
    <?php if ($show_cpk_status): ?>
    <div class="fx-status is-pending" id="cpkStatusWrap">
        <span class="fx-status__dot" id="cpkStatusDot"></span>
        <span id="cpkStatusText"><?= __('logout') === 'Logout' ? 'Checking CPK...' : 'กำลังตรวจสอบ CPK...' ?></span>
    </div>
    <?php endif; ?>
</div>
