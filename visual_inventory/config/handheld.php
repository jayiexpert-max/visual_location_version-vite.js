<?php

/**
 * Resolve handheld asset URLs so /handheld/ and /public/handheld/ share one asset folder.
 */
function handheld_web_base(): string
{
    static $base = null;

    if ($base !== null) {
        return $base;
    }

    $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/handheld'));

    if (str_ends_with($scriptDir, '/public/handheld')) {
        $base = preg_replace('#/public/handheld$#', '/handheld', $scriptDir);
    } else {
        $base = $scriptDir;
    }

    return $base ?: '/handheld';
}

function handheld_asset(string $file): string
{
    $path = rtrim(handheld_web_base(), '/') . '/assets/' . ltrim($file, '/');
    $full = __DIR__ . '/../handheld/assets/' . ltrim($file, '/');
    if (is_file($full)) {
        $path .= '?v=' . filemtime($full);
    }

    return $path;
}

/**
 * Web path to public/ for API proxies (works from /handheld/ and /public/handheld/).
 */
/**
 * Public web assets (factory.css, favicon) — same files as desktop app.
 */
function handheld_public_asset(string $file): string
{
    $path = rtrim(handheld_api_base(), '/') . '/assets/' . ltrim($file, '/');
    $full = __DIR__ . '/../public/assets/' . ltrim($file, '/');
    if (is_file($full)) {
        $path .= '?v=' . filemtime($full);
    }

    return $path;
}

function handheld_api_base(): string
{
    static $base = null;

    if ($base !== null) {
        return $base;
    }

    $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/handheld'));

    if (str_ends_with($scriptDir, '/public/handheld')) {
        $base = preg_replace('#/public/handheld$#', '/public', $scriptDir);
    } else {
        $root = preg_replace('#/handheld$#', '', $scriptDir);
        $base = rtrim($root, '/') . '/public';
    }

    return $base ?: '/public';
}
