<?php

/**
 * Handheld top bar — matches ui_preview .fx-hh-top (Back | Title).
 */
require_once __DIR__ . '/../../config/handheld.php';

$bar_title = $bar_title ?? 'Handheld';
$bar_kicker = $bar_kicker ?? 'KEYENCE BT-A500';
$bar_show_logout = $bar_show_logout ?? false;
$bar_menu = $bar_menu ?? false;
$bar_user = $bar_user ?? ($_SESSION['username'] ?? 'User');

?>
<?php if ($bar_menu): ?>
    <div class="fx-hh-top fx-hh-top--menu">
        <span class="fx-hh-kicker"><?= htmlspecialchars($bar_kicker) ?></span>
        <span class="fx-hh-title"><?= htmlspecialchars($bar_title) ?></span>
    </div>
    <p class="fx-hh-user"><?= htmlspecialchars($bar_user) ?></p>
<?php else: ?>
    <div class="fx-hh-top">
        <a href="index" class="fx-hh-back" aria-label="Back to menu">&larr; Back</a>
        <span class="fx-hh-title"><?= htmlspecialchars($bar_title) ?></span>
        <?php if ($bar_show_logout): ?>
            <a class="fx-hh-logout" href="logout" aria-label="Logout" title="Logout"
                onclick="return confirm('Logout? / ออกจากระบบ?')">&times;</a>
        <?php endif; ?>
    </div>
<?php endif; ?>
