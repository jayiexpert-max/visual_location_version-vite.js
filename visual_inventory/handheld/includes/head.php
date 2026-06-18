<?php
/**
 * Handheld shared head — factory.css + handheld overlay (ui_preview pattern).
 */
require_once __DIR__ . '/../../config/handheld.php';

$hh_title = $hh_title ?? 'Handheld';
?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title><?= htmlspecialchars($hh_title) ?></title>
    <link rel="icon" type="image/png" href="<?= htmlspecialchars(handheld_public_asset('favicon.png')) ?>">
    <link rel="stylesheet" href="<?= htmlspecialchars(handheld_public_asset('factory.css')) ?>">
    <link rel="stylesheet" href="<?= htmlspecialchars(handheld_asset('handheld.css')) ?>">
