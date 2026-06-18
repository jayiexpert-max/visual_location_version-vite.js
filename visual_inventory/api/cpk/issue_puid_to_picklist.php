<?php

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/../../config/condb.php';
require_once __DIR__ . '/../../config/inventory_api_service.php';
require_once __DIR__ . '/../../config/fifo_service.php';
require_once __DIR__ . '/../../config/picklist_issue_service.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cpk_api_json('error', picklist_issue_msg(picklist_issue_is_en(), 'issue_failed'), null, 405);
}

cpk_api_require_mcid_for_post();

$body = cpk_api_read_json_body();
$picklistId = trim($body['PicklistID'] ?? $body['picklist_id'] ?? '');
$puid = trim($body['PUID'] ?? $body['puid'] ?? '');
$operator = trim($body['Operator'] ?? $body['operator'] ?? ($_SESSION['username'] ?? ''));

$isEN = picklist_issue_is_en();

if ($picklistId === '' || $puid === '') {
    cpk_api_json('error', picklist_issue_msg($isEN, 'ids_required'), null, 400);
}

if ($operator === '') {
    cpk_api_json('error', picklist_issue_msg($isEN, 'operator_required'), null, 400);
}

$fifoCheck = fifo_validate_for_picklist_issue($condb, $puid, $isEN);
if (!$fifoCheck['ok']) {
    $fifoMsg = picklist_localize_issue_message((string) ($fifoCheck['message'] ?? ''), $isEN);
    cpk_api_json('error', $fifoMsg, $fifoCheck['data'] ?? null, 400);
}

$issue = cpk_issue_puid_to_picklist_call($picklistId, $puid, $operator);
if ($issue['ok']) {
    $responseData = is_array($issue['data']) ? $issue['data'] : [];
    $userId = (int) ($_SESSION['user_id'] ?? 0);
    $puidInfo = $issue['puid_info'] ?? ($responseData['PUIDInfo'] ?? null);

    // Log while local row still readable, then cut local stock so rack/search no longer show the reel.
    $responseData['ReportLogged'] = inventory_log_picklist_issue(
        $condb,
        $picklistId,
        $puid,
        $userId,
        $puidInfo,
        $operator
    );
    $localWithdraw = inventory_withdraw_puid_local($condb, $puid);
    $responseData['LocalWithdrawn'] = $localWithdraw['ok'];
    if (!$localWithdraw['ok']) {
        $responseData['LocalWithdrawMessage'] = $localWithdraw['message'];
    }

    if (!empty($fifoCheck['data']) && is_array($fifoCheck['data'])) {
        $responseData['fifo'] = $fifoCheck['data'];
        if (!empty($fifoCheck['renewal_notice'])) {
            $responseData['fifo_renewal_notice'] = true;
        }
    }

    cpk_api_json('success', picklist_localize_issue_message((string) ($issue['message'] ?? ''), $isEN), $responseData);
}
cpk_api_json(
    'error',
    picklist_localize_issue_message((string) ($issue['message'] ?? ''), $isEN),
    $issue['data'] ?? null,
    400
);
