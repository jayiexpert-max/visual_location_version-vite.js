<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_only_guard(true);

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../config/helpers.php';

$apiUrl = pdservice_test_url();

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_PROXY, '');

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);
curl_close($ch);

$serverIp = $_SERVER['SERVER_ADDR'] ?? 'Unknown';
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';

if ($httpCode >= 200 && $httpCode < 400) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Connected',
        'http_code' => $httpCode,
        'server_ip' => $serverIp,
        'client_ip' => $clientIp,
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Connection Failed',
        'curl_error' => $curlError,
        'curl_errno' => $curlErrno,
        'http_code' => $httpCode,
        'server_ip' => $serverIp,
        'client_ip' => $clientIp,
        'api_url' => $apiUrl,
    ]);
}
