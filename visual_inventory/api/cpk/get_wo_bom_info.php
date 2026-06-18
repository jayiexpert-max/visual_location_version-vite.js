<?php

require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    cpk_api_json('error', 'Only GET allowed', null, 405);
}

$wo = trim($_GET['wo'] ?? $_GET['workorder'] ?? '');
if ($wo === '') {
    cpk_api_json('error', 'wo (or workorder) is required', null, 400);
}

$result = cpk_get('GET_WOBOMInfo', $wo);
cpk_api_from_result($result);
