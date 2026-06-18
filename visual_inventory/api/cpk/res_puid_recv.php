<?php

require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cpk_api_json('error', 'Only POST allowed', null, 405);
}

cpk_api_require_mcid_for_post();

$body = cpk_api_read_json_body();
$resNo = trim($body['RES_NO'] ?? $body['res_no'] ?? '');
$puid = trim($body['PUID'] ?? $body['puid'] ?? '');
$operator = trim($body['Operator'] ?? $body['operator'] ?? ($_SESSION['username'] ?? ''));

if ($resNo === '' || $puid === '') {
    cpk_api_json('error', 'RES_NO and PUID are required', null, 400);
}

if ($operator === '') {
    cpk_api_json('error', 'Operator is required', null, 400);
}

$payload = [
    'RES_NO' => $resNo,
    'PUID' => $puid,
    'Operator' => $operator,
];

$location = trim($body['Location'] ?? $body['location'] ?? '');
if ($location !== '') {
    $payload['Location'] = strlen($location) > 100 ? substr($location, 0, 100) : $location;
}

$result = cpk_post_authenticated('RES_PUIDRecv', $payload);
cpk_api_from_result($result);
