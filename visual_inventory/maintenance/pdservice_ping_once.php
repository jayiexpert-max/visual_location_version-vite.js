<?php
require_once __DIR__ . '/../config/env_loader.php';
require_once __DIR__ . '/../config/helpers.php';

$url = pdservice_test_url();
$timeout = (int) (env('PDSERVICE_CURL_TIMEOUT', '5') ?? 5);
$connect = (int) (env('PDSERVICE_CURL_CONNECT_TIMEOUT', '3') ?? 3);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $connect);
$t = microtime(true);
$body = curl_exec($ch);
$ms = round((microtime(true) - $t) * 1000);
$http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
$errno = curl_errno($ch);
curl_close($ch);

echo json_encode([
    'url' => $url,
    'timeout_sec' => $timeout,
    'connect_timeout_sec' => $connect,
    'ms' => $ms,
    'http_code' => $http,
    'curl_errno' => $errno,
    'curl_error' => $err ?: null,
    'ok' => $body !== false && $http >= 200 && $http < 400,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
