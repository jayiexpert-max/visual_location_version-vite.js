<?php

header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../config/auth_helpers.php';
cors_allow_app_origin();

require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/res_info_service.php';

$resNo = trim($_GET['res_no'] ?? '');

if ($resNo === '') {
    echo json_encode(['status' => 'error', 'message' => 'RES Number is required']);
    exit;
}

echo json_encode(res_info_fetch_with_local($condb, $resNo));
