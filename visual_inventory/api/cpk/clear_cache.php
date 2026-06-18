<?php

require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cpk_api_json('error', 'Only POST allowed', null, 405);
}

if (($_SESSION['role'] ?? '') !== 'admin') {
    cpk_api_json('error', 'Admin access required', null, 403);
}

cpk_api_require_mcid_for_post();

$body = cpk_api_read_json_body();
$clearTarget = trim($body['ClearTarget'] ?? $body['clear_target'] ?? 'ALL');

$result = cpk_post_authenticated('ClearCache', ['ClearTarget' => $clearTarget]);
cpk_api_from_result($result);
