<?php
/**
 * Standard page header with optional back link.
 * Set $show_nav_back = false to hide.
 */
$show_nav_back = $show_nav_back ?? true;
?>
<?php if ($show_nav_back): ?>
    <a href="index" class="btn btn-outline"><i class="fas fa-home"></i> <?= __('back_to_main') ?></a>
<?php endif; ?>
