<?php

require_once __DIR__ . '/env_loader.php';
require_once __DIR__ . '/dev_guard.php';

/**
 * Require logged-in admin. Sends 403 if role is not admin.
 */
function maintenance_require_admin(bool $json = false): void
{
    if (($_SESSION['role'] ?? '') === 'admin') {
        return;
    }

    if ($json) {
        header('Content-Type: application/json; charset=UTF-8');
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Forbidden: admin role required.',
        ]);
        exit;
    }

    header('HTTP/1.0 403 Forbidden');
    echo 'Forbidden: admin role required.';
    exit;
}

/**
 * session_check + admin in production; any logged-in user in development.
 * For IT tools (e.g. cpk_test.php) usable in production by admins.
 */
function maintenance_cpk_test_guard(): void
{
    require_once __DIR__ . '/session_check.php';

    if (($_SESSION['role'] ?? '') === 'admin' || is_development()) {
        return;
    }

    dev_guard_or_exit(false);
}

/**
 * dev_guard + session_check + admin — dangerous DB/migration maintenance scripts.
 */
function maintenance_dev_admin_guard(bool $json = false): void
{
    dev_guard_or_exit($json);
    require_once __DIR__ . '/session_check.php';
    maintenance_require_admin($json);
}

/**
 * dev_guard only — dev test endpoints (matches public/test_api.php pattern).
 */
function maintenance_dev_only_guard(bool $json = false): void
{
    dev_guard_or_exit($json);
}
