<?php
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/helpers.php';

$apiUrl = pdservice_test_url();

$results = [
    'status' => 'success',
    'step1_local_server' => [
        'status' => 'success',
        'message' => 'Web Server is running',
        'server_ip' => $_SERVER['SERVER_ADDR'] ?? 'Unknown',
        'client_ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
        'php_version' => PHP_VERSION,
    ],
    'step2_api_connection' => [],
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, pdservice_curl_timeout());
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, pdservice_curl_connect_timeout());
curl_setopt($ch, CURLOPT_PROXY, '');

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);
curl_close($ch);

$results['step2_api_connection'] = [
    'url' => $apiUrl,
    'http_code' => $httpCode,
    'curl_error' => $curlError,
    'curl_errno' => $curlErrno,
    'status' => ($httpCode >= 200 && $httpCode < 400) ? 'Connected' : 'Failed',
];

echo json_encode($results, JSON_PRETTY_PRINT);
