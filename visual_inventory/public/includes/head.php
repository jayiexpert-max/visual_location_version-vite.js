<?php
/**
 * Common HTML head — set $page_title before including.
 * Optional: $extra_head_links (array of link tags), $include_style_css (bool)
 */
$page_title = $page_title ?? __('dashboard_title');
$include_style_css = $include_style_css ?? false;
$extra_head_links = $extra_head_links ?? [];
$lang = $_SESSION['lang'] ?? 'th';
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang) ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
<?php if ($include_style_css): ?>
    <link rel="stylesheet" href="style.css">
<?php endif; ?>
<?php foreach ($extra_head_links as $linkTag): ?>
    <?= $linkTag . "\n" ?>
<?php endforeach; ?>
