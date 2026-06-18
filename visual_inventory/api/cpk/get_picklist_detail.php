<?php

require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cpk_api_json('error', 'Only POST allowed', null, 405);
}

cpk_api_require_mcid_for_post();

$body = cpk_api_read_json_body();
$picklistId = trim($body['PicklistID'] ?? $body['picklist_id'] ?? '');

if ($picklistId === '') {
    cpk_api_json('error', 'PicklistID is required', null, 400);
}

$requiredOnly = false;
if (array_key_exists('RequiredOnly', $body)) {
    $requiredOnly = filter_var($body['RequiredOnly'], FILTER_VALIDATE_BOOLEAN);
} elseif (array_key_exists('required_only', $body)) {
    $requiredOnly = filter_var($body['required_only'], FILTER_VALIDATE_BOOLEAN);
}

$result = cpk_get_picklist_detail_call($picklistId, $requiredOnly);

$responseData = is_array($result['data']) ? $result['data'] : [];
if (is_array($responseData)) {
    $responseData['Request'] = $result['request_sent'] ?? null;
    $responseData['Meta'] = [
        'RequiredOnlyRequested' => !empty($result['required_only_requested']),
        'RequiredOnlyFilteredLocally' => !empty($result['required_only_filtered_locally']),
        'RequiredOnlySentToCpk' => !empty($result['required_only_sent_to_cpk']),
        'LineCount' => count($result['lines'] ?? []),
        'LineCountRaw' => (int) ($result['line_count_raw'] ?? 0),
        'RequestBy' => $result['request_by'] ?? null,
        'CpkErrCode00008' => cpk_is_picklist_required_only_service_error(
            (string) ($responseData['Message'] ?? $result['message'] ?? '')
        ),
    ];
    if (!empty($result['required_only_filtered_locally'])) {
        $responseData['Lines'] = $result['lines'];
    }
}

if (!$result['ok']) {
    $http = !empty($result['transport_failure']) ? 502 : 400;
    cpk_api_json('error', $result['message'], $responseData ?: null, $http);
}

cpk_api_json('success', $result['message'], $responseData);
