<?php

require_once __DIR__ . '/helpers.php';

/**
 * True when the client expects JSON (API folder, public JSON proxies, or AJAX).
 */
function session_auth_wants_json(): bool
{
    $uri = $_SERVER['REQUEST_URI'] ?? '';

    if (strpos($uri, '/api/') !== false) {
        return true;
    }

    $publicJsonScripts = [
        'api_gateway.php',
        'get_inventory_proxy.php',
        'get_box_layout.php',
        'api_find_location.php',
        'api_tv_highlight.php',
    ];

    foreach ($publicJsonScripts as $script) {
        if (strpos($uri, $script) !== false) {
            return true;
        }
    }

    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    if (stripos($accept, 'application/json') !== false) {
        return true;
    }

    $xhr = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    if (strcasecmp($xhr, 'XMLHttpRequest') === 0) {
        return true;
    }

    return false;
}

function session_auth_json_exit(string $message, int $httpCode = 401): void
{
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code($httpCode);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

function session_auth_deny_unauthenticated(string $message = 'Session expired or not logged in.', ?string $timeoutReason = null): void
{
    if (session_auth_wants_json()) {
        session_auth_json_exit($message);
    }

    $isHandheld = strpos($_SERVER['REQUEST_URI'] ?? '', '/handheld/') !== false;
    $query = [];
    if ($timeoutReason !== null && $timeoutReason !== '') {
        $query['timeout'] = '1';
        $query['reason'] = $timeoutReason;
    }

    $location = 'login';
    if ($query !== []) {
        $location .= '?' . http_build_query($query);
    }

    header('Location: ' . $location);
    exit;
}

/**
 * Reflect CORS only for requests from the same host as APP_BASE_URL (not *).
 */
function session_role(): string
{
    return (string) ($_SESSION['role'] ?? '');
}

function role_is_admin(): bool
{
    return session_role() === 'admin';
}

function role_is_material_prep(): bool
{
    return session_role() === 'material_prep';
}

/** Inbound receive: RES management + add stock (admin, material_prep only). */
function role_can_receive_inbound(): bool
{
    return in_array(session_role(), ['admin', 'material_prep'], true);
}

/** Full warehouse staff (admin + material_prep). */
function role_is_warehouse_staff(): bool
{
    return in_array(session_role(), ['admin', 'material_prep'], true);
}

/** Picklist issue + HANA picklist report (admin, material_prep, user). */
function role_can_warehouse_issue(): bool
{
    return in_array(session_role(), ['admin', 'material_prep', 'user'], true);
}

function cors_allow_app_origin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return;
    }

    $baseHost = parse_url(app_base_url(), PHP_URL_HOST);
    $originHost = parse_url($origin, PHP_URL_HOST);

    if ($baseHost && $originHost && strcasecmp((string) $baseHost, (string) $originHost) === 0) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }
}
