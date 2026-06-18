<?php

require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    cpk_api_json('error', 'Only GET allowed', null, 405);
}

$result = cpk_get('GetVersion');
cpk_api_from_result($result, true);
