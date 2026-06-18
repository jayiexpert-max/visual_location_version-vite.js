<?php

require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cpk_api_json('error', 'Only POST allowed', null, 405);
}

cpk_api_require_mcid_for_post();

$uid = cpk_public_uid(false);
if (!$uid['ok']) {
    cpk_api_json('error', $uid['message'], $uid['data'], 400);
}

cpk_api_json('success', 'PublicUID obtained', [
    'PublicUID' => $uid['public_uid'],
    'ExpiredDate' => $_SESSION['cpk_public_uid_expires'] ?? null,
    'cpk_response' => $uid['data'],
]);
