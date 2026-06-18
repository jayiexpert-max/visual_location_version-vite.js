<?php
require_once __DIR__ . '/../config/env_loader.php';
require_once __DIR__ . '/../config/cpk_service.php';

$t = microtime(true);
$r = cpk_get('GetVersion');
$ms = round((microtime(true) - $t) * 1000);

echo json_encode([
    'base_url' => cpk_base_url(),
    'timeout_sec' => cpk_curl_timeout(),
    'ms' => $ms,
    'ok' => $r['ok'],
    'http_code' => $r['http_code'],
    'error' => $r['error'],
    'cpk_message' => $r['cpk_message'],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
