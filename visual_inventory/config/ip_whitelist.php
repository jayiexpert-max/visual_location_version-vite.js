<?php

require_once __DIR__ . '/helpers.php';

function client_ip_address(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '');
}

/**
 * When env list is empty/unset, all IPs are allowed.
 */
function ip_whitelist_allowed(?string $envKey = 'TV_ALLOWED_IPS'): bool
{
    $list = trim(env($envKey, '') ?? '');
    if ($list === '') {
        return true;
    }

    $ip = client_ip_address();
    foreach (explode(',', $list) as $entry) {
        $entry = trim($entry);
        if ($entry !== '' && hash_equals($entry, $ip)) {
            return true;
        }
    }

    return false;
}

function ip_whitelist_deny_if_blocked(?string $envKey = 'TV_ALLOWED_IPS'): void
{
    if (ip_whitelist_allowed($envKey)) {
        return;
    }

    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Access denied';
    exit;
}
