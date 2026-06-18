<?php

require_once __DIR__ . '/helpers.php';

/**
 * Shared secret for TV kiosk read-only endpoints (no user session).
 * Set TV_KIOSK_KEY in .env; pass as ?tv_key=... or header X-TV-Kiosk-Key.
 */
function tv_kiosk_key_expected(): ?string
{
    $key = env('TV_KIOSK_KEY', null);
    return ($key !== null && $key !== '') ? $key : null;
}

function tv_kiosk_key_provided(): string
{
    return (string) ($_GET['tv_key'] ?? $_SERVER['HTTP_X_TV_KIOSK_KEY'] ?? '');
}

function tv_kiosk_key_valid(): bool
{
    $expected = tv_kiosk_key_expected();
    if ($expected === null) {
        return false;
    }

    $provided = tv_kiosk_key_provided();
    if ($provided === '') {
        return false;
    }

    return hash_equals($expected, $provided);
}

/**
 * Call before session_check to allow TV kiosk without login when key matches.
 */
function tv_kiosk_try_bypass(): void
{
    if (tv_kiosk_key_valid() && !defined('AUTH_TV_KIOSK_BYPASS')) {
        define('AUTH_TV_KIOSK_BYPASS', true);
    }
}

function session_auth_tv_kiosk_bypassed(): bool
{
    return defined('AUTH_TV_KIOSK_BYPASS') && AUTH_TV_KIOSK_BYPASS;
}

/**
 * Public read-only display pages/APIs (TV, 3D layout) — no login required.
 */
function public_display_script_name(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
    $base = basename($path);

    return preg_replace('/\.php$/i', '', $base);
}

function public_display_request(): bool
{
    $script = public_display_script_name();

    if (in_array($script, ['tv_display', 'layout_3d'], true)) {
        return true;
    }

    if ($script === 'get_box_layout') {
        return true;
    }

    if ($script === 'api_find_location') {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        return $method === 'GET' || $method === 'OPTIONS';
    }

    if ($script === 'api_tv_highlight') {
        $action = $_GET['action'] ?? $_POST['action'] ?? '';

        return $action === 'get';
    }

    return false;
}

function public_display_try_bypass(): void
{
    if (public_display_request() && !defined('AUTH_TV_KIOSK_BYPASS')) {
        define('AUTH_TV_KIOSK_BYPASS', true);
    }
}
