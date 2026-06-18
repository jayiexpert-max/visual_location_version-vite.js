<?php
/**
 * Factory app bar — set $page_title before include.
 * Optional: $page_icon (Font Awesome class), $is_dashboard, $show_home (default true)
 */
$page_title = $page_title ?? __('dashboard_title');
$page_icon = $page_icon ?? 'fa-warehouse';
$show_home = $show_home ?? true;
$is_dashboard = $is_dashboard ?? false;
$lang = $_SESSION['lang'] ?? 'th';
$username = htmlspecialchars($_SESSION['username'] ?? 'User');
$role = htmlspecialchars($_SESSION['role'] ?? '');
$langQueryTh = http_build_query(array_merge($_GET, ['lang' => 'th']));
$langQueryEn = http_build_query(array_merge($_GET, ['lang' => 'en']));
?>
<header class="fx-appbar">
    <div class="fx-appbar__brand">
        <i class="fas <?= htmlspecialchars($page_icon) ?>"></i>
        <?php if ($is_dashboard): ?>
            <span><?= __('system_name') ?></span>
        <?php else: ?>
            <h1 class="fx-appbar__title"><?= htmlspecialchars($page_title) ?></h1>
        <?php endif; ?>
    </div>
    <div class="fx-appbar__actions">
        <div class="fx-lang">
            <a href="?<?= htmlspecialchars($langQueryTh) ?>" class="<?= $lang === 'th' ? 'is-active' : '' ?>">TH</a>
            <span>|</span>
            <a href="?<?= htmlspecialchars($langQueryEn) ?>" class="<?= $lang === 'en' ? 'is-active' : '' ?>">EN</a>
        </div>
        <?php if ($show_home && !$is_dashboard): ?>
            <a href="index" class="fx-btn-ghost"><i class="fas fa-home"></i> <?= __('back_to_main') ?></a>
        <?php endif; ?>
        <?php if ($is_dashboard): ?>
            <span class="fx-appbar__user"><?= $username ?> (<?= $role ?>)</span>
            <a href="logout" class="fx-btn-ghost" onclick="return confirm('<?= htmlspecialchars(__('confirm_logout'), ENT_QUOTES) ?>')">
                <i class="fas fa-sign-out-alt"></i> <?= __('logout') ?>
            </a>
        <?php endif; ?>
    </div>
</header>
