<?php

require_once __DIR__ . '/helpers.php';

/**
 * Block access unless APP_ENV=development.
 */
function dev_guard_or_exit(bool $json = false): void
{
    if (is_development()) {
        return;
    }

    if ($json) {
        header('Content-Type: application/json; charset=UTF-8');
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Forbidden: development tools are disabled in production.',
        ]);
        exit;
    }

    header('HTTP/1.0 403 Forbidden');
    echo 'Forbidden: development tools are disabled in production.';
    exit;
}
