<?php

require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cpk_api_json('error', 'Only POST allowed', null, 405);
}

cpk_api_require_mcid_for_post();

$body = cpk_api_read_json_body();
$picklistId = trim($body['PicklistID'] ?? $body['picklist_id'] ?? '');
$operator = trim($body['Operator'] ?? $body['operator'] ?? ($_SESSION['username'] ?? ''));
$kitsNote = trim((string) ($body['KitsNote'] ?? $body['kits_note'] ?? ''));

$result = cpk_close_picklist_call($picklistId, $operator, $kitsNote);

$data = is_array($result['data']) ? $result['data'] : [];
$shape = [
    'Status' => (string) ($data['Status'] ?? ($result['ok'] ? 'S' : 'E')),
    'Message' => (string) ($data['Message'] ?? $result['message'] ?? ''),
    'CloseDone' => !empty($data['CloseDone']) || !empty($result['close_done']),
    'Request' => $result['request_sent'] ?? null,
];

if (!$result['ok']) {
    $http = !empty($result['transport_failure']) ? 502 : 400;
    cpk_api_json('error', $shape['Message'] ?: $result['message'], $shape, $http);
}

cpk_api_json('success', $shape['Message'], $shape);
