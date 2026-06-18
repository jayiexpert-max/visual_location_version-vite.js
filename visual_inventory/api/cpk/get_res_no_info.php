<?php

require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    cpk_api_json('error', 'Only GET allowed', null, 405);
}

$keyword = trim($_GET['keyword'] ?? $_GET['res_no'] ?? '');
if ($keyword === '') {
    cpk_api_json('error', 'keyword (or res_no) is required', null, 400);
}

$result = cpk_get('GET_RESNoInfo', $keyword);
cpk_api_from_result($result);
