<?php

require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cpk_api_json('error', 'Only POST allowed', null, 405);
}

cpk_api_require_mcid_for_post();

$body = cpk_api_read_json_body();
$result = cpk_post_authenticated_read('GetOpenPicklists', $body);
cpk_api_from_result($result);
