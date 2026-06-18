<?php

require_once __DIR__ . '/../../config/env_loader.php';
require_once __DIR__ . '/../../config/cpk_service.php';
require_once __DIR__ . '/../../config/session_check.php';

header('Content-Type: application/json; charset=UTF-8');

function cpk_api_read_json_body(): array
{
    // api_gateway.php reads php://input once and caches in API_JSON_BODY
    if (function_exists('api_json_body')) {
        return api_json_body();
    }

    if (isset($GLOBALS['API_JSON_BODY']) && is_array($GLOBALS['API_JSON_BODY'])) {
        return $GLOBALS['API_JSON_BODY'];
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function cpk_api_json(string $status, string $message, $data = null, int $httpCode = 200): void
{
    if ($httpCode !== 200) {
        http_response_code($httpCode);
    }

    echo json_encode([
        'status' => $status,
        'message' => $message,
        'data' => $data,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function cpk_api_from_result(array $result, bool $allowPlainSuccess = false): void
{
    if (!$result['ok']) {
        $message = $result['cpk_message'] ?? $result['error'] ?? 'CPK request failed';
        cpk_api_json('error', $message, is_array($result['data']) ? $result['data'] : null, 502);
    }

    if ($allowPlainSuccess && !is_array($result['data'])) {
        cpk_api_json('success', 'OK', $result['data']);
    }

    cpk_api_json('success', $result['cpk_message'] ?? 'OK', $result['data']);
}

function cpk_api_require_mcid_for_post(): void
{
    if (cpk_mcid() !== null) {
        return;
    }

    cpk_api_json('error', cpk_mcid_missing_message(), null, 400);
}
