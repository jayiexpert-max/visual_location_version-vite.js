<?php
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/cpk_service.php';

$apiUrl = pdservice_test_url();

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
curl_setopt($ch, CURLOPT_PROXY, '');

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);
curl_close($ch);

$pdsOk = ($response !== false && $httpCode >= 200 && $httpCode < 400);

$cpkOk = false;
$cpkMessage = 'CPK not configured';
if (cpk_mcid() !== null) {
    $version = cpk_get('GetVersion');
    $cpkOk = $version['ok'] && ($version['http_code'] ?? 0) >= 200 && ($version['http_code'] ?? 0) < 400;
    $cpkMessage = $cpkOk
        ? 'CPK reachable'
        : (string) ($version['cpk_message'] ?? $version['error'] ?? 'CPK unreachable');
}

$ok = $pdsOk || $cpkOk;
$message = 'OK';
if ($pdsOk && $cpkOk) {
    $message = 'PDService and CPK reachable';
} elseif ($pdsOk) {
    $message = 'PDService reachable (CPK offline)';
} elseif ($cpkOk) {
    $message = 'PDService offline — CPK available for material lookup';
} else {
    $message = 'PDService and CPK unreachable — check LAN and factory network';
}

echo json_encode([
    'status' => $ok ? 'success' : 'error',
    'pdservice' => $pdsOk ? 'connected' : 'failed',
    'cpk' => $cpkOk ? 'connected' : 'failed',
    'message' => $message,
    'cpk_message' => $cpkMessage,
    'http_code' => $httpCode,
    'curl_error' => $curlError,
    'curl_errno' => $curlErrno,
], JSON_UNESCAPED_UNICODE);
