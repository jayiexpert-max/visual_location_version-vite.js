<?php

putenv('CPK_USE_LEGACY_URL=true');
$_ENV['CPK_USE_LEGACY_URL'] = 'true';

require_once __DIR__ . '/../config/env_loader.php';
require_once __DIR__ . '/../config/cpk_service.php';

session_start();
$picklistId = $argv[1] ?? 'MPL26231113';

cpk_public_uid(true);
echo 'Legacy URL: ' . cpk_path('GetPicklistDetail') . PHP_EOL;

$result = cpk_post_authenticated('GetPicklistDetail', ['PicklistID' => $picklistId]);
echo 'ok=' . ($result['ok'] ? '1' : '0') . ' msg=' . ($result['cpk_message'] ?? '') . PHP_EOL;
echo substr((string) ($result['raw'] ?? ''), 0, 800) . PHP_EOL;
