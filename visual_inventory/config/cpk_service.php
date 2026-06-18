<?php

require_once __DIR__ . '/env_loader.php';
require_once __DIR__ . '/helpers.php';

/**
 * CPK Service base URL (new or legacy).
 */
function cpk_base_url(): string
{
    $useLegacy = strtolower(env('CPK_USE_LEGACY_URL', 'false') ?? 'false') === 'true';
    $key = $useLegacy ? 'CPK_SERVICE_LEGACY_URL' : 'CPK_SERVICE_BASE_URL';
    $default = $useLegacy
        ? 'http://194.10.10.15/CPKservice/cpkservice.svc/rest'
        : 'http://194.10.10.15/CPKservice/cpk_service';

    return rtrim(env($key, $default) ?? $default, '/');
}

/**
 * HANA Report web — create/manage CPK picklists (external ASP.NET app on CPK host).
 */
function cpk_hana_picklist_report_url(): string
{
    $custom = trim((string) (env('HANA_PICKLIST_REPORT_URL', '') ?? ''));
    if ($custom !== '') {
        return $custom;
    }

    $parsed = parse_url(cpk_base_url());
    $scheme = $parsed['scheme'] ?? 'http';
    $host = $parsed['host'] ?? '194.10.10.15';

    return $scheme . '://' . $host . '/hana_report/Default.aspx';
}

function cpk_use_legacy_url(): bool
{
    return strtolower(env('CPK_USE_LEGACY_URL', 'false') ?? 'false') === 'true';
}

/**
 * Build full URL for a CPK endpoint segment.
 */
function cpk_endpoint_url(string $segment): string
{
    $segment = ltrim($segment, '/');
    return cpk_base_url() . '/' . $segment;
}

/**
 * Map logical endpoint names to path segments (legacy may differ in casing).
 */
function cpk_path(string $logical, ?string $pathParam = null): string
{
    $legacy = cpk_use_legacy_url();
    $paths = [
        'GetVersion' => 'GetVersion',
        'GET_RESNoInfo' => 'GET_RESNoInfo',
        'GET_WOBOMInfo' => $legacy ? 'get_wobomInfo' : 'GET_WOBOMInfo',
        'GetPublicUID' => 'GetPublicUID/',
        'RES_PUIDRecv' => 'RES_PUIDRecv/',
        'IssuePUIDToPicklist' => 'IssuePUIDToPicklist/',
        'UpdatePUIDStatus' => 'UpdatePUIDStatus/',
        'GetOpenPicklists' => 'GetOpenPicklists/',
        'GetPicklistDetail' => 'GetPicklistDetail/',
        'ClosePicklist' => 'ClosePicklist/',
        'BookingOutPUID' => 'BookingOutPUID/',
        'StationInvenCheck' => 'StationInvenCheck/',
        'ClearCache' => 'ClearCache/',
    ];

    $segment = $paths[$logical] ?? $logical;
    if ($pathParam !== null && $pathParam !== '') {
        $segment = rtrim($segment, '/') . '/' . rawurlencode($pathParam);
    }

    return cpk_endpoint_url($segment);
}

function cpk_curl_timeout(): int
{
    return max(5, (int) (env('CPK_CURL_TIMEOUT', '30') ?? 30));
}

function cpk_curl_connect_timeout(): int
{
    return max(2, (int) (env('CPK_CURL_CONNECT_TIMEOUT', '10') ?? 10));
}

/**
 * Shorter timeouts for save-path CPK calls (receive, add_stock, picklist issue).
 * Defaults: 15s total / 5s connect / 0 retries when CPK is optional on timeout.
 */
function cpk_curl_save_timeout(): int
{
    $custom = trim((string) (env('CPK_CURL_SAVE_TIMEOUT', '') ?? ''));
    if ($custom !== '') {
        return max(5, (int) $custom);
    }

    if (!cpk_receive_required()) {
        return min(cpk_curl_timeout(), 15);
    }

    return cpk_curl_timeout();
}

function cpk_curl_save_connect_timeout(): int
{
    $custom = trim((string) (env('CPK_CURL_SAVE_CONNECT_TIMEOUT', '') ?? ''));
    if ($custom !== '') {
        return max(2, (int) $custom);
    }

    return min(cpk_curl_connect_timeout(), 5);
}

function cpk_curl_save_retries(): int
{
    return max(0, (int) (env('CPK_CURL_SAVE_RETRIES', '0') ?? 0));
}

/**
 * @return array{timeout:int,connect_timeout:int,retries:int}
 */
function cpk_save_http_opts(): array
{
    return [
        'timeout' => cpk_curl_save_timeout(),
        'connect_timeout' => cpk_curl_save_connect_timeout(),
        'retries' => cpk_curl_save_retries(),
    ];
}

/**
 * Shorter timeouts for read-path CPK calls (GET_RESNoInfo, picklists, StationInvenCheck).
 */
function cpk_curl_read_timeout(): int
{
    $custom = trim((string) (env('CPK_CURL_READ_TIMEOUT', '') ?? ''));
    if ($custom !== '') {
        return max(5, (int) $custom);
    }

    return min(cpk_curl_timeout(), 12);
}

function cpk_curl_read_connect_timeout(): int
{
    $custom = trim((string) (env('CPK_CURL_READ_CONNECT_TIMEOUT', '') ?? ''));
    if ($custom !== '') {
        return max(2, (int) $custom);
    }

    return min(cpk_curl_connect_timeout(), 5);
}

function cpk_curl_read_retries(): int
{
    return max(0, (int) (env('CPK_CURL_READ_RETRIES', '0') ?? 0));
}

/**
 * @return array{timeout:int,connect_timeout:int,retries:int}
 */
function cpk_read_http_opts(): array
{
    return [
        'timeout' => cpk_curl_read_timeout(),
        'connect_timeout' => cpk_curl_read_connect_timeout(),
        'retries' => cpk_curl_read_retries(),
    ];
}

/**
 * When false, skip PDService + StationInvenCheck after UpdatePUIDStatus (add_stock save path).
 */
function cpk_verify_central_after_save(): bool
{
    return strtolower(trim((string) (env('CPK_VERIFY_CENTRAL_AFTER_SAVE', 'false') ?? 'false'))) === 'true';
}

/**
 * When false, reservation receive may save locally if CPK is unreachable (timeout/network).
 */
function cpk_receive_required(): bool
{
    return strtolower(trim((string) (env('CPK_RECEIVE_REQUIRED', 'false') ?? 'false'))) === 'true';
}

/**
 * When true, add_stock / UpdatePUIDStatus must succeed at CPK before local save.
 */
function cpk_update_puid_required(): bool
{
    return strtolower(trim((string) (env('CPK_UPDATE_PUID_REQUIRED', 'true') ?? 'true'))) === 'true';
}

/**
 * When true, wo_material_calc must sync IssuePUIDToPicklist at CPK before local save.
 */
function cpk_withdraw_required(): bool
{
    return strtolower(trim((string) (env('CPK_WITHDRAW_REQUIRED', 'true') ?? 'true'))) === 'true';
}

/**
 * Parse a positive quantity from form/API input (supports commas).
 */
function cpk_parse_positive_qty(string $raw): ?float
{
    $raw = trim(str_replace([',', ' '], '', $raw));
    if ($raw === '' || !is_numeric($raw)) {
        return null;
    }

    $qty = (float) $raw;

    return $qty > 0 ? $qty : null;
}

/**
 * Request / required qty from GET_RESNoInfo item row.
 */
function cpk_item_request_qty(array $item): ?int
{
    foreach (['RequestQty', 'MatReqQty', 'ReqQty', 'RequiredQty', 'Quantity', 'MatQty'] as $key) {
        if (!isset($item[$key]) || $item[$key] === '') {
            continue;
        }

        $raw = $item[$key];
        if (is_numeric($raw)) {
            $v = (int) round((float) $raw);
        } else {
            $parsed = cpk_parse_positive_qty((string) $raw);
            if ($parsed === null) {
                continue;
            }
            $v = (int) round($parsed);
        }

        if ($v > 0) {
            return $v;
        }
    }

    return null;
}

/**
 * Required qty from GET_WOBOMInfo material row (numeric MatReqQty only).
 */
function cpk_wo_bom_required_qty(array $mat): ?float
{
    foreach (['MatReqQty', 'ReqQty', 'RequiredQty', 'Quantity'] as $key) {
        if (!isset($mat[$key]) || $mat[$key] === '' || $mat[$key] === null) {
            continue;
        }
        $parsed = cpk_parse_positive_qty((string) $mat[$key]);
        if ($parsed !== null) {
            return $parsed;
        }
    }

    return null;
}

/**
 * Normalize scanned PUID: trim, uppercase, strip optional VL prefix.
 */
function cpk_normalize_puid_input(string $puid): string
{
    $puid = strtoupper(trim($puid));

    return (string) preg_replace('/^VL/', '', $puid);
}

/**
 * Real PUID only (≤64 chars; no DUMMYBATCH / MAT_DOC).
 * Accepts hex-style IDs such as 847125390E2E (no VL prefix required).
 *
 * @return string|null Error message in English, or null if valid
 */
function cpk_validate_real_puid(string $puid): ?string
{
    $puid = cpk_normalize_puid_input($puid);
    if ($puid === '') {
        return 'PUID is required';
    }
    if (strlen($puid) > 64) {
        return 'PUID exceeds 64 characters';
    }

    if (str_contains($puid, 'DUMMYBATCH') || str_contains($puid, 'MAT_DOC')) {
        return 'A real PUID is required (DUMMYBATCH / MAT_DOC not allowed)';
    }

    return null;
}

/**
 * Format New_Qty for CPK UpdatePUIDStatus (string, preserves user-entered value).
 */
function cpk_format_new_qty_for_api(float $qty): string
{
    if (fmod($qty, 1.0) === 0.0) {
        return (string) (int) round($qty);
    }

    return rtrim(rtrim(sprintf('%.6f', $qty), '0'), '.');
}

/**
 * CPK station row: Quantity may be Correction; effective remain = OriginalQty + Correction.
 */
function cpk_station_row_effective_remain(array $row): ?int
{
    $original = null;
    foreach (['OriginalQty', 'Qty', 'OriginalQuantity'] as $key) {
        if (isset($row[$key]) && is_numeric($row[$key])) {
            $original = (float) $row[$key];
            break;
        }
    }

    $quantity = null;
    foreach (['Quantity', 'QtyRemain', 'Correction'] as $key) {
        if (isset($row[$key]) && is_numeric($row[$key])) {
            $quantity = (float) $row[$key];
            break;
        }
    }

    if ($original !== null && $quantity !== null && $quantity < 0) {
        $effective = $original + $quantity;

        return $effective > 0 ? (int) round($effective) : null;
    }

    if ($quantity !== null && $quantity > 0) {
        return (int) round($quantity);
    }

    if ($original !== null && $original > 0) {
        return (int) round($original);
    }

    return null;
}

/**
 * @return array{old_qty: ?float, new_qty: ?float, correction: ?float, effective_remain: ?int}
 */
function cpk_puid_info_breakdown(?array $puidInfo): array
{
    $oldQty = null;
    $newQty = null;
    $correction = null;

    if (is_array($puidInfo)) {
        if (isset($puidInfo['OldQty']) && is_numeric($puidInfo['OldQty'])) {
            $oldQty = (float) $puidInfo['OldQty'];
        }
        if (isset($puidInfo['NewQty']) && is_numeric($puidInfo['NewQty'])) {
            $newQty = (float) $puidInfo['NewQty'];
        }
        if (isset($puidInfo['Correction']) && is_numeric($puidInfo['Correction'])) {
            $correction = (float) $puidInfo['Correction'];
        }
    }

    $effective = null;
    if ($newQty !== null && $newQty > 0) {
        $effective = (int) round($newQty);
    } elseif ($oldQty !== null && $correction !== null) {
        $sum = $oldQty + $correction;
        if ($sum > 0) {
            $effective = (int) round($sum);
        }
    }

    return [
        'old_qty' => $oldQty,
        'new_qty' => $newQty,
        'correction' => $correction,
        'effective_remain' => $effective,
    ];
}

/**
 * Read confirmed remain qty from CPK UpdatePUIDStatus PUIDInfo (NewQty only).
 */
function cpk_puid_info_new_qty(?array $puidInfo): ?int
{
    $breakdown = cpk_puid_info_breakdown($puidInfo);

    return $breakdown['effective_remain'];
}

function cpk_qty_matches_target(?int $effective, int $target): bool
{
    if ($effective === null || $target <= 0) {
        return false;
    }

    return $effective === $target;
}

/**
 * True for timeout / connection failures (not business-rule rejections from CPK).
 */
function cpk_is_transport_failure(array $result): bool
{
    if (!empty($result['ok'])) {
        return false;
    }

    $msg = strtolower((string) ($result['error'] ?? $result['cpk_message'] ?? ''));
    if ($msg === '') {
        return ((int) ($result['http_code'] ?? 0)) === 0;
    }

    return strpos($msg, 'timeout') !== false
        || strpos($msg, 'timed out') !== false
        || strpos($msg, 'unreachable') !== false
        || strpos($msg, 'no data from') !== false
        || strpos($msg, 'could not resolve') !== false
        || strpos($msg, 'failed to connect') !== false
        || strpos($msg, 'curl request failed') !== false;
}

/**
 * Turn raw cURL errors into actionable messages (timeout, unreachable, etc.).
 */
function cpk_format_curl_error(?string $curlError, string $url = ''): string
{
    $raw = trim((string) $curlError);
    if ($raw === '') {
        return 'CPK request failed (no response)';
    }

    $isTimeout = stripos($raw, 'timed out') !== false
        || stripos($raw, 'timeout') !== false;
    if ($isTimeout) {
        $sec = cpk_curl_timeout();
        $host = $url !== '' ? parse_url($url, PHP_URL_HOST) : parse_url(cpk_base_url(), PHP_URL_HOST);
        $host = $host ?: 'CPK server';
        return "CPK API timeout ({$sec}s, no data from {$host}). "
            . 'Check CPK service/network, or raise CPK_CURL_TIMEOUT in .env. '
            . "Raw: {$raw}";
    }

    if (stripos($raw, 'could not resolve host') !== false
        || stripos($raw, 'failed to connect') !== false) {
        return "CPK API unreachable. Check VPN/LAN and CPK_SERVICE_BASE_URL in .env. Raw: {$raw}";
    }

    return "CPK API error: {$raw}";
}

/**
 * @return array{ok:bool,http_code:int,data:mixed,raw:string,error:?string,cpk_status:?string,cpk_message:?string}
 */
function cpk_http_request(string $method, string $url, ?array $body = null, int $retriesLeft = 1, array $httpOpts = []): array
{
    $timeout = isset($httpOpts['timeout']) ? (int) $httpOpts['timeout'] : cpk_curl_timeout();
    $connectTimeout = isset($httpOpts['connect_timeout']) ? (int) $httpOpts['connect_timeout'] : cpk_curl_connect_timeout();

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $connectTimeout);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));

    $headers = ['Accept: application/json'];
    if ($body !== null) {
        $json = json_encode($body);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
        $headers[] = 'Content-Type: application/json';
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlErrno = curl_errno($ch);
    curl_close($ch);

    if ($raw === false) {
        $retryable = $retriesLeft > 0
            && ($curlErrno === 28 || $curlErrno === CURLE_OPERATION_TIMEDOUT
                || $curlErrno === 7 || $curlErrno === CURLE_COULDNT_CONNECT);
        if ($retryable) {
            return cpk_http_request($method, $url, $body, $retriesLeft - 1, $httpOpts);
        }

        $friendly = cpk_format_curl_error($curlError, (string) $url);
        return [
            'ok' => false,
            'http_code' => $httpCode,
            'data' => null,
            'raw' => '',
            'error' => $friendly,
            'cpk_status' => 'E',
            'cpk_message' => $friendly,
        ];
    }

    $decoded = json_decode($raw, true);
    $isJson = json_last_error() === JSON_ERROR_NONE && is_array($decoded);

    $cpkStatus = $isJson && isset($decoded['Status']) ? (string) $decoded['Status'] : null;
    $cpkMessage = $isJson && isset($decoded['Message']) ? (string) $decoded['Message'] : null;

    $ok = $httpCode >= 200 && $httpCode < 300;
    if ($isJson && $cpkStatus !== null) {
        $ok = $ok && cpk_is_success($decoded);
    }

    return [
        'ok' => $ok,
        'http_code' => $httpCode,
        'data' => $isJson ? $decoded : $raw,
        'raw' => $raw,
        'error' => $ok ? null : ($cpkMessage ?: "HTTP $httpCode"),
        'cpk_status' => $cpkStatus,
        'cpk_message' => $cpkMessage,
    ];
}

/**
 * @return array{ok:bool,http_code:int,data:mixed,raw:string,error:?string,cpk_status:?string,cpk_message:?string}
 */
function cpk_get(string $logical, ?string $pathParam = null, array $httpOpts = []): array
{
    $opts = $httpOpts !== [] ? $httpOpts : cpk_read_http_opts();
    $retries = array_key_exists('retries', $opts) ? (int) $opts['retries'] : cpk_curl_read_retries();

    return cpk_http_request('GET', cpk_path($logical, $pathParam), null, $retries, $opts);
}

/**
 * @return array{ok:bool,http_code:int,data:mixed,raw:string,error:?string,cpk_status:?string,cpk_message:?string}
 */
function cpk_post(string $logical, array $body = [], array $httpOpts = []): array
{
    $retries = array_key_exists('retries', $httpOpts) ? (int) $httpOpts['retries'] : 1;

    return cpk_http_request('POST', cpk_path($logical), $body, $retries, $httpOpts);
}

function cpk_is_success($response): bool
{
    if (!is_array($response)) {
        return false;
    }

    return isset($response['Status']) && $response['Status'] === 'S';
}

/**
 * Positive remain qty from a CPK PUID row (GET_RESNoInfo / station).
 */
function cpk_puid_qty_remain(array $row): ?int
{
    foreach (['QtyRemain', 'Quantity', 'Qty', 'OriginalQty', 'RemainQty', 'MatQty'] as $key) {
        if (!isset($row[$key]) || $row[$key] === '') {
            continue;
        }

        $raw = $row[$key];
        if (is_numeric($raw)) {
            $v = (int) round((float) $raw);
        } else {
            $parsed = cpk_parse_positive_qty((string) $raw);
            if ($parsed === null) {
                continue;
            }
            $v = (int) round($parsed);
        }

        if ($v > 0) {
            return $v;
        }
    }

    return null;
}

function cpk_is_puid_received_flag($value): bool
{
    if ($value === null || $value === '') {
        return false;
    }

    if (is_bool($value)) {
        return $value;
    }

    if (is_numeric($value)) {
        return (int) $value === 1;
    }

    $v = strtoupper(trim((string) $value));

    return in_array($v, ['Y', 'YES', 'TRUE', '1', 'R', 'RECEIVED', 'DONE'], true);
}

function cpk_is_already_received_message(?string $message): bool
{
    if ($message === null || $message === '') {
        return false;
    }

    $m = strtolower($message);

    return strpos($m, 'already received') !== false
        || strpos($m, 'already recv') !== false
        || strpos($m, 'puid already') !== false;
}

function cpk_is_already_issued_message(?string $message): bool
{
    if ($message === null || $message === '') {
        return false;
    }

    $m = strtolower($message);

    return strpos($m, 'already issued') !== false
        || strpos($m, 'already issue') !== false
        || strpos($m, 'puid already') !== false
        || strpos($m, 'issued to this picklist') !== false
        || strpos($m, 'issued to picklist') !== false;
}

function cpk_mcid(): ?string
{
    $mcid = trim(env('CPK_MC_ID', '') ?? '');
    return $mcid !== '' ? $mcid : null;
}

function cpk_station_key(): ?string
{
    $key = trim(env('CPK_STATION_KEY', '') ?? '');
    return $key !== '' ? $key : null;
}

/**
 * Clear cached PublicUID in session.
 */
function cpk_clear_public_uid_cache(): void
{
    unset($_SESSION['cpk_public_uid'], $_SESSION['cpk_public_uid_expires']);
}

function cpk_public_uid_expired(): bool
{
    if (empty($_SESSION['cpk_public_uid']) || empty($_SESSION['cpk_public_uid_expires'])) {
        return true;
    }

    $expires = strtotime((string) $_SESSION['cpk_public_uid_expires']);
    if ($expires === false) {
        return true;
    }

    return time() >= $expires;
}

/**
 * Human-readable error when McID is not configured.
 */
function cpk_mcid_missing_message(): string
{
    return 'CPK McID is not configured. Set CPK_MC_ID in .env (from IT) to use authenticated CPK POST endpoints.';
}

/**
 * Fetch and cache PublicUID (requires McID + StationKey).
 *
 * @return array{ok:bool,public_uid:?string,message:string,data:?array}
 */
function cpk_public_uid(bool $forceRefresh = false, array $httpOpts = []): array
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (!$forceRefresh && !cpk_public_uid_expired() && !empty($_SESSION['cpk_public_uid'])) {
        return [
            'ok' => true,
            'public_uid' => (string) $_SESSION['cpk_public_uid'],
            'message' => 'OK',
            'data' => null,
        ];
    }

    $mcid = cpk_mcid();
    $stationKey = cpk_station_key();

    if ($mcid === null) {
        return [
            'ok' => false,
            'public_uid' => null,
            'message' => cpk_mcid_missing_message(),
            'data' => null,
        ];
    }

    if ($stationKey === null) {
        return [
            'ok' => false,
            'public_uid' => null,
            'message' => 'CPK StationKey is not configured. Set CPK_STATION_KEY in .env.',
            'data' => null,
        ];
    }

    $result = cpk_post('GetPublicUID', [
        'McID' => $mcid,
        'StationKey' => $stationKey,
    ], $httpOpts);

    if (!$result['ok'] || !is_array($result['data'])) {
        cpk_clear_public_uid_cache();
        return [
            'ok' => false,
            'public_uid' => null,
            'message' => $result['cpk_message'] ?? $result['error'] ?? 'GetPublicUID failed',
            'data' => is_array($result['data']) ? $result['data'] : null,
        ];
    }

    $publicUid = $result['data']['PublicUID'] ?? null;
    $expiredDate = $result['data']['ExpiredDate'] ?? null;

    if (empty($publicUid)) {
        cpk_clear_public_uid_cache();
        return [
            'ok' => false,
            'public_uid' => null,
            'message' => $result['data']['Message'] ?? 'GetPublicUID returned no PublicUID',
            'data' => $result['data'],
        ];
    }

    $_SESSION['cpk_public_uid'] = $publicUid;
    $_SESSION['cpk_public_uid_expires'] = $expiredDate;

    return [
        'ok' => true,
        'public_uid' => (string) $publicUid,
        'message' => 'OK',
        'data' => $result['data'],
    ];
}

/**
 * Warm PublicUID in the current PHP session (e.g. right after login).
 * Does not block login on CPK failure — later cpk_post_authenticated will retry.
 *
 * @return array{ok:bool,warmed:bool,from_cache:bool,message:string}
 */
function cpk_prewarm_public_uid(): array
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (cpk_mcid() === null || cpk_station_key() === null) {
        return [
            'ok' => true,
            'warmed' => false,
            'from_cache' => false,
            'message' => 'CPK McID/StationKey not configured — skip prewarm',
        ];
    }

    $fromCache = !cpk_public_uid_expired() && !empty($_SESSION['cpk_public_uid']);
    $result = cpk_public_uid(false, cpk_read_http_opts());

    return [
        'ok' => true,
        'warmed' => $result['ok'],
        'from_cache' => $fromCache,
        'message' => $result['message'],
    ];
}

/**
 * True when CPK response indicates invalid/expired PublicUID.
 */
function cpk_is_public_uid_error(array $result): bool
{
    if (!is_array($result['data'])) {
        return false;
    }

    $message = (string) ($result['cpk_message'] ?? $result['data']['Message'] ?? '');
    return stripos($message, 'PublicUID') !== false
        && (stripos($message, 'invalid') !== false || stripos($message, 'expired') !== false);
}

/**
 * POST with PublicUID injected; retries once after token refresh on invalid/expired.
 *
 * @return array{ok:bool,http_code:int,data:mixed,raw:string,error:?string,cpk_status:?string,cpk_message:?string}
 */
function cpk_post_authenticated_read(string $logical, array $body): array
{
    return cpk_post_authenticated($logical, $body, cpk_read_http_opts());
}

function cpk_post_authenticated(string $logical, array $body, array $httpOpts = []): array
{
    $saveOpts = $httpOpts !== [] ? $httpOpts : cpk_save_http_opts();

    $uidResult = cpk_public_uid(false, $saveOpts);
    if (!$uidResult['ok']) {
        return [
            'ok' => false,
            'http_code' => 0,
            'data' => ['Status' => 'E', 'Message' => $uidResult['message']],
            'raw' => '',
            'error' => $uidResult['message'],
            'cpk_status' => 'E',
            'cpk_message' => $uidResult['message'],
        ];
    }

    $body['PublicUID'] = $uidResult['public_uid'];
    $result = cpk_post($logical, $body, $saveOpts);

    if (cpk_is_public_uid_error($result)) {
        cpk_clear_public_uid_cache();
        $uidResult = cpk_public_uid(true, $saveOpts);
        if (!$uidResult['ok']) {
            return [
                'ok' => false,
                'http_code' => 0,
                'data' => ['Status' => 'E', 'Message' => $uidResult['message']],
                'raw' => '',
                'error' => $uidResult['message'],
                'cpk_status' => 'E',
                'cpk_message' => $uidResult['message'],
            ];
        }

        $body['PublicUID'] = $uidResult['public_uid'];
        $result = cpk_post($logical, $body, $saveOpts);
    }

    return $result;
}

/**
 * UpdatePUIDStatus — kitting return / qty & location sync at CPK.
 *
 * @param array<string, mixed> $locData Loc_Shelf, Loc_Level, Loc_Box, Loc_Slot, Location
 * @return array{
 *   ok: bool,
 *   update_done: bool,
 *   message: string,
 *   warnings: array<int, mixed>,
 *   puid_info: ?array,
 *   transport_failure: bool,
 *   data: mixed
 * }
 */
function cpk_update_puid_status_call(
    string $puid,
    string $operator,
    string $newQty,
    array $locData = []
): array {
    $puid = trim($puid);
    $operator = trim($operator);
    $newQty = trim($newQty);

    if ($puid === '' || $operator === '' || $newQty === '') {
        return [
            'ok' => false,
            'update_done' => false,
            'message' => 'PUID, Operator and New_Qty are required',
            'warnings' => [],
            'puid_info' => null,
            'transport_failure' => false,
            'data' => null,
        ];
    }

    $qtyValue = cpk_parse_positive_qty($newQty);
    if ($qtyValue === null) {
        return [
            'ok' => false,
            'update_done' => false,
            'message' => 'New_Qty must be a number greater than 0',
            'warnings' => [],
            'puid_info' => null,
            'transport_failure' => false,
            'data' => null,
        ];
    }

    $payload = [
        'PUID' => $puid,
        'Operator' => $operator,
        'New_Qty' => cpk_format_new_qty_for_api($qtyValue),
    ];

    $location = cpk_build_location($locData);
    if ($location !== '') {
        $payload['Location'] = $location;
    }

    $result = cpk_post_authenticated('UpdatePUIDStatus', $payload);
    $data = is_array($result['data']) ? $result['data'] : [];
    $message = (string) ($data['Message'] ?? $result['cpk_message'] ?? $result['error'] ?? 'CPK UpdatePUIDStatus failed');
    $warnings = isset($data['Warnings']) && is_array($data['Warnings']) ? $data['Warnings'] : [];
    $puidInfo = isset($data['PUIDInfo']) && is_array($data['PUIDInfo']) ? $data['PUIDInfo'] : null;
    $qtyBreakdown = cpk_puid_info_breakdown($puidInfo);
    $updateDone = !empty($data['UpdateDone']);
    $ok = $result['ok'] && cpk_is_success($data);

    if ($ok && $updateDone) {
        if (!function_exists('station_inven_clear_session_cache')) {
            require_once __DIR__ . '/station_inven_sync_service.php';
        }
        station_inven_clear_session_cache();
    }

    return [
        'ok' => $ok,
        'update_done' => $updateDone,
        'message' => $message,
        'warnings' => $warnings,
        'puid_info' => $puidInfo,
        'qty_breakdown' => $qtyBreakdown,
        'transport_failure' => cpk_is_transport_failure($result),
        'data' => $data,
    ];
}

/**
 * IssuePUIDToPicklist — issue/disburse PUID (picklist or work-order issuing list).
 *
 * @return array{
 *   ok: bool,
 *   issue_done: bool,
 *   message: string,
 *   puid_info: ?array,
 *   transport_failure: bool,
 *   data: mixed
 * }
 */
function cpk_issue_puid_to_picklist_call(string $picklistId, string $puid, string $operator): array
{
    $picklistId = trim($picklistId);
    $puid = trim($puid);
    $operator = trim($operator);

    if ($picklistId === '' || $puid === '' || $operator === '') {
        return [
            'ok' => false,
            'issue_done' => false,
            'message' => 'PicklistID, PUID and Operator are required',
            'puid_info' => null,
            'transport_failure' => false,
            'data' => null,
        ];
    }

    $result = cpk_post_authenticated('IssuePUIDToPicklist', [
        'PicklistID' => $picklistId,
        'PUID' => $puid,
        'Operator' => $operator,
    ]);
    $data = is_array($result['data']) ? $result['data'] : [];
    $message = (string) ($data['Message'] ?? $result['cpk_message'] ?? $result['error'] ?? 'CPK IssuePUIDToPicklist failed');
    $puidInfo = isset($data['PUIDInfo']) && is_array($data['PUIDInfo']) ? $data['PUIDInfo'] : null;
    $issueDone = !empty($data['IssueDone']);
    $ok = $result['ok'] && cpk_is_success($data);

    return [
        'ok' => $ok,
        'issue_done' => $issueDone,
        'message' => $message,
        'puid_info' => $puidInfo,
        'transport_failure' => cpk_is_transport_failure($result),
        'data' => $data,
    ];
}

/**
 * ClosePicklist — manually close an open picklist (Kitting / WinApp equivalent).
 *
 * @return array{
 *   ok: bool,
 *   close_done: bool,
 *   message: string,
 *   transport_failure: bool,
 *   data: mixed,
 *   request_sent: array<string, mixed>
 * }
 */
function cpk_close_picklist_call(string $picklistId, string $operator, string $kitsNote = ''): array
{
    $picklistId = trim($picklistId);
    $operator = trim($operator);
    $kitsNote = trim($kitsNote);

    if ($picklistId === '') {
        return [
            'ok' => false,
            'close_done' => false,
            'message' => 'PicklistID is required',
            'transport_failure' => false,
            'data' => ['Status' => 'E', 'Message' => 'PicklistID is required', 'CloseDone' => false],
            'request_sent' => [],
        ];
    }

    if (strlen($picklistId) > 50) {
        return [
            'ok' => false,
            'close_done' => false,
            'message' => 'PicklistID must be at most 50 characters',
            'transport_failure' => false,
            'data' => ['Status' => 'E', 'Message' => 'PicklistID exceeds 50 characters', 'CloseDone' => false],
            'request_sent' => [],
        ];
    }

    if ($operator === '') {
        return [
            'ok' => false,
            'close_done' => false,
            'message' => 'Operator is required',
            'transport_failure' => false,
            'data' => ['Status' => 'E', 'Message' => 'Operator is required', 'CloseDone' => false],
            'request_sent' => [],
        ];
    }

    if (strlen($operator) > 50) {
        return [
            'ok' => false,
            'close_done' => false,
            'message' => 'Operator must be at most 50 characters',
            'transport_failure' => false,
            'data' => ['Status' => 'E', 'Message' => 'Operator exceeds 50 characters', 'CloseDone' => false],
            'request_sent' => [],
        ];
    }

    if (strlen($kitsNote) > 200) {
        return [
            'ok' => false,
            'close_done' => false,
            'message' => 'KitsNote must be at most 200 characters',
            'transport_failure' => false,
            'data' => ['Status' => 'E', 'Message' => 'KitsNote exceeds 200 characters', 'CloseDone' => false],
            'request_sent' => [],
        ];
    }

    $payload = [
        'PicklistID' => $picklistId,
        'Operator' => $operator,
    ];
    if ($kitsNote !== '') {
        $payload['KitsNote'] = $kitsNote;
    }

    $result = cpk_post_authenticated('ClosePicklist', $payload);

    $requestSent = $payload;
    if (!empty($_SESSION['cpk_public_uid'])) {
        $requestSent['PublicUID'] = (string) $_SESSION['cpk_public_uid'];
    }

    $data = is_array($result['data']) ? $result['data'] : [];
    $message = (string) ($data['Message'] ?? $result['cpk_message'] ?? $result['error'] ?? 'CPK ClosePicklist failed');
    $closeDone = !empty($data['CloseDone']);
    $ok = $result['ok'] && cpk_is_success($data) && $closeDone;

    return [
        'ok' => $ok,
        'close_done' => $closeDone,
        'message' => $message,
        'transport_failure' => cpk_is_transport_failure($result),
        'data' => $data,
        'request_sent' => $requestSent,
    ];
}

/**
 * BookingOutPUID PUIDInfo status field — CPK spec: String status name (e.g. "Kitting Room", "Store").
 */
function cpk_format_booking_out_status_field(mixed $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    if (is_string($value)) {
        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }
    if (is_int($value) || is_float($value)) {
        return (string) (int) $value;
    }

    $trimmed = trim((string) $value);

    return $trimmed !== '' ? $trimmed : null;
}

/**
 * Normalize BookingOutPUID PUIDInfo per CPK spec (OldStatus/NewStatus as String).
 *
 * @return array<string, mixed>|null
 */
function cpk_normalize_booking_out_puid_info(?array $info): ?array
{
    if (!is_array($info) || $info === []) {
        return null;
    }

    $out = [];

    foreach (['PUID', 'PartNumber', 'BatchNumber'] as $key) {
        if (!isset($info[$key]) || $info[$key] === '') {
            continue;
        }
        $out[$key] = trim((string) $info[$key]);
    }

    if (isset($info['OldMcID']) && is_numeric($info['OldMcID'])) {
        $out['OldMcID'] = (int) $info['OldMcID'];
    }
    if (isset($info['NewMcID']) && is_numeric($info['NewMcID'])) {
        $out['NewMcID'] = (int) $info['NewMcID'];
    }

    $oldStatus = cpk_format_booking_out_status_field($info['OldStatus'] ?? null);
    $newStatus = cpk_format_booking_out_status_field($info['NewStatus'] ?? null);
    if ($oldStatus !== null) {
        $out['OldStatus'] = $oldStatus;
    }
    if ($newStatus !== null) {
        $out['NewStatus'] = $newStatus;
    }

    if (isset($info['Quantity']) && is_numeric($info['Quantity'])) {
        $out['Quantity'] = (float) $info['Quantity'];
    }
    if (isset($info['Correction']) && is_numeric($info['Correction'])) {
        $out['Correction'] = (float) $info['Correction'];
    }

    $dest = cpk_normalize_booking_destination((string) ($info['Destination'] ?? ''));
    if ($dest !== null) {
        $out['Destination'] = $dest;
    }

    return $out === [] ? null : $out;
}

/**
 * Normalize BookingOutPUID destination to STORE or OTHER.
 */
function cpk_normalize_booking_destination(string $destination): ?string
{
    $value = strtoupper(trim($destination));
    if ($value === 'STORE' || $value === 'OTHER') {
        return $value;
    }

    return null;
}

/**
 * Pre-check BookingOutPUID eligibility from preview data (spec-aligned rules only).
 * Does not block on PDService StatusName (e.g. Restricted) — CPK returns the official Message.
 *
 * @param array<string, mixed> $found
 * @return array{
 *   eligible: bool,
 *   destination: string,
 *   blockers: list<string>,
 *   blockers_th: list<string>
 * }
 */
function cpk_booking_out_eligibility(array $found, string $destination = 'STORE'): array
{
    $dest = cpk_normalize_booking_destination($destination) ?? 'STORE';
    $blockers = [];
    $blockersTh = [];

    $sources = $found['preview_sources'] ?? [];
    $inStation = in_array('cpk_station', $sources, true)
        || ($found['cpk_effective_remain'] ?? null) !== null;

    if (!$inStation) {
        $blockers[] = 'Service Rejected: PUID is not in this station local stock area';
        $blockersTh[] = 'Service Rejected: PUID ไม่ได้อยู่ในพื้นที่ Local Stock ของสถานีนี้';
    }

    $stationMcId = cpk_mcid();
    $puidMcId = trim((string) ($found['McID'] ?? ''));
    if ($stationMcId !== null && $puidMcId !== '' && (int) $puidMcId !== (int) $stationMcId) {
        $blockers[] = 'Service Rejected: PUID is not in this station local stock area (McID '
            . $puidMcId . ' ≠ station ' . $stationMcId . ')';
        $blockersTh[] = 'Service Rejected: PUID ไม่ได้อยู่ในพื้นที่ Local Stock ของสถานีนี้ (McID '
            . $puidMcId . ' ≠ สถานี ' . $stationMcId . ')';
    }

    if ($dest === 'STORE') {
        $exp = trim((string) ($found['ExpirationDate'] ?? ''));
        if ($exp !== '') {
            $expTs = strtotime($exp);
            if ($expTs !== false) {
                $days = (int) floor(($expTs - time()) / 86400);
                if ($days < 31) {
                    $blockers[] = 'Service Rejected: PUID expires within 31 days and cannot be sent to STORE';
                    $blockersTh[] = 'Service Rejected: PUID ใกล้หมดอายุ (ภายใน 31 วัน) ส่งไป STORE ไม่ได้';
                }
            }
        }
    }

    return [
        'eligible' => $blockers === [],
        'destination' => $dest,
        'blockers' => $blockers,
        'blockers_th' => $blockersTh,
    ];
}

/**
 * BookingOutPUID user message — pass through CPK spec messages; map ERR_CODE#00010 to Service Error.
 */
function cpk_format_booking_out_user_message(string $message, ?array $context = null): string
{
    unset($context);

    $knownPatterns = [
        'destination must be store or other',
        'not in this station local stock',
        'status is blocked for booking out',
        'expires within 31 days',
        'service accepted: success',
    ];

    $lower = strtolower($message);
    foreach ($knownPatterns as $pattern) {
        if (str_contains($lower, $pattern)) {
            return $message;
        }
    }

    if (!str_contains($message, 'ERR_CODE#00010')) {
        return $message;
    }

    return 'Service Error: CPK internal error (ERR_CODE#00010). Please Contact IT Support. [' . $message . ']';
}

/**
 * BookingOutPUID — send PUID out from station local stock (STORE / OTHER).
 *
 * @return array{
 *   ok: bool,
 *   booking_out_done: bool,
 *   message: string,
 *   puid_info: ?array,
 *   transport_failure: bool,
 *   data: mixed,
 *   request_sent: array<string, mixed>
 * }
 */
function cpk_booking_out_puid_call(string $puid, string $operator, string $destination): array
{
    $puid = cpk_normalize_puid_input($puid);
    $operator = trim($operator);

    $puidError = cpk_validate_real_puid($puid);
    if ($puidError !== null) {
        return [
            'ok' => false,
            'booking_out_done' => false,
            'message' => $puidError,
            'puid_info' => null,
            'transport_failure' => false,
            'data' => ['Status' => 'E', 'Message' => $puidError, 'BookingOutDone' => false],
            'request_sent' => [],
        ];
    }

    if ($operator === '') {
        return [
            'ok' => false,
            'booking_out_done' => false,
            'message' => 'Operator is required',
            'puid_info' => null,
            'transport_failure' => false,
            'data' => ['Status' => 'E', 'Message' => 'Operator is required', 'BookingOutDone' => false],
            'request_sent' => [],
        ];
    }

    if (strlen($operator) > 50) {
        return [
            'ok' => false,
            'booking_out_done' => false,
            'message' => 'Operator must be at most 50 characters',
            'puid_info' => null,
            'transport_failure' => false,
            'data' => ['Status' => 'E', 'Message' => 'Operator exceeds 50 characters', 'BookingOutDone' => false],
            'request_sent' => [],
        ];
    }

    $dest = cpk_normalize_booking_destination($destination);
    if ($dest === null) {
        return [
            'ok' => false,
            'booking_out_done' => false,
            'message' => 'Destination must be STORE or OTHER',
            'puid_info' => null,
            'transport_failure' => false,
            'data' => ['Status' => 'E', 'Message' => 'Destination must be STORE or OTHER', 'BookingOutDone' => false],
            'request_sent' => [],
        ];
    }

    $payload = [
        'PUID' => $puid,
        'Operator' => $operator,
        'Destination' => $dest,
    ];

    $result = cpk_post_authenticated('BookingOutPUID', $payload);

    $requestSent = $payload;
    if (!empty($_SESSION['cpk_public_uid'])) {
        $requestSent['PublicUID'] = (string) $_SESSION['cpk_public_uid'];
    }

    $data = is_array($result['data']) ? $result['data'] : [];
    $rawMessage = (string) ($data['Message'] ?? $result['cpk_message'] ?? $result['error'] ?? 'CPK BookingOutPUID failed');
    $message = cpk_format_booking_out_user_message($rawMessage);
    $puidInfo = cpk_normalize_booking_out_puid_info(
        isset($data['PUIDInfo']) && is_array($data['PUIDInfo']) ? $data['PUIDInfo'] : null
    );
    $bookingOutDone = !empty($data['BookingOutDone']);
    $ok = $result['ok'] && cpk_is_success($data) && $bookingOutDone;

    if (!$ok && is_array($data)) {
        $data['Message'] = $message;
    }
    if ($puidInfo !== null && is_array($data)) {
        $data['PUIDInfo'] = $puidInfo;
    }

    return [
        'ok' => $ok,
        'booking_out_done' => $bookingOutDone,
        'message' => $message,
        'puid_info' => $puidInfo,
        'transport_failure' => cpk_is_transport_failure($result),
        'data' => $data,
        'request_sent' => $requestSent,
    ];
}

/**
 * @param array<int, mixed> $warnings
 */
function cpk_format_warnings_html(array $warnings): string
{
    if ($warnings === []) {
        return '';
    }

    $lines = [];
    foreach ($warnings as $w) {
        if (!is_array($w)) {
            continue;
        }
        $code = trim((string) ($w['Code'] ?? ''));
        $msg = trim((string) ($w['Message'] ?? ''));
        $lines[] = htmlspecialchars($code !== '' ? "{$code}: {$msg}" : $msg);
    }

    return $lines === [] ? '' : '<br><small>⚠️ ' . implode('<br>⚠️ ', $lines) . '</small>';
}

/**
 * Build location string for RES_PUIDRecv (max 100 chars).
 */
function cpk_build_location(array $data): string
{
    $parts = array_filter([
        !empty($data['Loc_Shelf']) ? 'Rack ' . $data['Loc_Shelf'] : '',
        !empty($data['Loc_Level']) ? 'L' . $data['Loc_Level'] : '',
        !empty($data['Loc_Box']) ? 'Box ' . $data['Loc_Box'] : '',
        !empty($data['Loc_Slot']) ? 'Slot ' . $data['Loc_Slot'] : '',
        $data['Location'] ?? '',
    ]);

    $location = trim(implode(' ', $parts));
    if (strlen($location) > 100) {
        $location = substr($location, 0, 100);
    }

    return $location;
}

/**
 * Material part number from CPK BOM row (new PartNumber or legacy MatNumber).
 */
function cpk_material_part_number(array $mat): string
{
    return (string) ($mat['PartNumber'] ?? $mat['MatNumber'] ?? '');
}

/**
 * @return array<string, mixed>
 */
function cpk_normalize_puid_row($row): array
{
    if (is_string($row)) {
        return ['PUID' => trim($row)];
    }

    if (!is_array($row)) {
        return ['PUID' => ''];
    }

    if (!isset($row['PUID']) && isset($row['PublicUID'])) {
        $row['PUID'] = $row['PublicUID'];
    }

    if (!isset($row['QtyRemain']) || $row['QtyRemain'] === '' || $row['QtyRemain'] === null) {
        $qty = cpk_puid_qty_remain($row);
        if ($qty !== null) {
            $row['QtyRemain'] = $qty;
        }
    }

    return $row;
}

/**
 * Normalize reservation item rows from CPK JSON.
 *
 * @return list<array<string, mixed>>
 */
function cpk_as_item_list($value): array
{
    if ($value === null || $value === '') {
        return [];
    }

    if (!is_array($value)) {
        return [];
    }

    if ($value === [] || array_is_list($value)) {
        return array_values(array_filter($value, 'is_array'));
    }

    if (isset($value['PartNumber']) || isset($value['ItemNo']) || isset($value['MatNumber'])) {
        return [$value];
    }

    foreach (['Item', 'ReservationItem', 'Items', 'Material', 'Detail', 'Line'] as $key) {
        if (isset($value[$key])) {
            return cpk_as_item_list($value[$key]);
        }
    }

    return array_values(array_filter($value, 'is_array'));
}

/**
 * Normalize PUID rows from CPK JSON.
 *
 * @return list<array<string, mixed>>
 */
function cpk_as_puid_list($value): array
{
    if ($value === null || $value === '') {
        return [];
    }

    if (is_string($value)) {
        return [cpk_normalize_puid_row($value)];
    }

    if (!is_array($value)) {
        return [];
    }

    if ($value === [] || array_is_list($value)) {
        return array_map('cpk_normalize_puid_row', $value);
    }

    foreach (['ReservationPUID', 'PUIDItem', 'Item'] as $key) {
        if (isset($value[$key])) {
            return cpk_as_puid_list($value[$key]);
        }
    }

    if (isset($value['PUID']) && is_array($value['PUID'])) {
        return cpk_as_puid_list($value['PUID']);
    }

    if (isset($value['PUID']) || isset($value['Received']) || isset($value['BatchNumber'])) {
        return [cpk_normalize_puid_row($value)];
    }

    return array_map('cpk_normalize_puid_row', array_values(array_filter($value, static function ($row) {
        return is_array($row) || is_string($row);
    })));
}

/** @deprecated Use cpk_as_item_list() or cpk_as_puid_list() */
function cpk_as_list($value): array
{
    return cpk_as_item_list($value);
}

/**
 * Normalize GET_RESNoInfo payload to a consistent shape.
 *
 * @return array<string, mixed>
 */
function cpk_normalize_res_info(array $payload): array
{
    if (isset($payload['Data']) && is_array($payload['Data'])) {
        $payload = array_merge($payload, $payload['Data']);
    }

    foreach (['ReservationItems', 'ReservationItem', 'RESItems'] as $altItemsKey) {
        if (empty($payload['Items']) && !empty($payload[$altItemsKey])) {
            $payload['Items'] = $payload[$altItemsKey];
        }
    }

    $items = [];
    foreach (cpk_as_item_list($payload['Items'] ?? []) as $item) {
        if (!is_array($item)) {
            continue;
        }

        $item['PUIDList'] = cpk_as_puid_list($item['PUIDList'] ?? []);
        $items[] = $item;
    }

    $payload['Items'] = $items;

    return $payload;
}

/**
 * SAP position/item code before _{ReqQty} in SAP_Info (e.g. NEW - 0070_{5,040} → 0070).
 */
function cpk_extract_sap_info_item_code(?string $sapInfo): ?string
{
    $sapInfo = trim((string) ($sapInfo ?? ''));
    if ($sapInfo === '') {
        return null;
    }

    if (preg_match('/([0-9]+)_\{/', $sapInfo, $matches)) {
        return $matches[1];
    }
    if (preg_match('/NEW\s*-\s*([0-9]+)\s*$/i', $sapInfo, $matches)) {
        return $matches[1];
    }
    if (preg_match('/^([0-9]+)\s*$/', $sapInfo, $matches)) {
        return $matches[1];
    }

    return null;
}

/**
 * Raw ReqQty token inside SAP_Info braces (display as CPK sent it: 5,040 / 245 / 5.040).
 */
function cpk_extract_sap_info_req_qty_token(?string $sapInfo): ?string
{
    $sapInfo = trim((string) ($sapInfo ?? ''));
    if ($sapInfo === '') {
        return null;
    }

    if (preg_match('/_\{([0-9]+(?:[.,][0-9]+)?)\}\s*$/', $sapInfo, $matches)) {
        return $matches[1];
    }

    return null;
}

/**
 * Numeric required qty from GetPicklistDetail SAP_Info (e.g. NEW - 0030_{5,040} → 5.04).
 */
function cpk_parse_sap_info_req_qty(?string $sapInfo): ?float
{
    $token = cpk_extract_sap_info_req_qty_token($sapInfo);
    if ($token === null) {
        return null;
    }

    $qty = (float) str_replace(',', '.', $token);

    return $qty > 0 ? $qty : null;
}

/**
 * CPK tail rows that are not issuable materials (e.g. PartNumber "Request By", "Kitting Room Notes").
 */
function cpk_picklist_is_meta_line(array $line): bool
{
    $part = trim((string) ($line['PartNumber'] ?? $line['HanaPart'] ?? $line['MatNumber'] ?? $line['Material'] ?? ''));
    if ($part === '') {
        return false;
    }

    $lower = strtolower($part);
    $metaLabels = [
        'request by',
        'requestby',
        'kitting room notes',
        'kitting notes',
        'notes',
        'remark',
        'requester',
    ];
    if (in_array($lower, $metaLabels, true)) {
        return true;
    }

    $sap = trim((string) ($line['SAP_Info'] ?? $line['SAPInfo'] ?? ''));
    $puid = strtolower(trim((string) ($line['PUID'] ?? '')));
    if ($sap === '' && ($puid === '' || $puid === 'x') && !preg_match('/\d{4,}/', $part)) {
        return true;
    }

    return false;
}

/**
 * Request By employee/id from CPK tail row (PartNumber "Request By" → Remark).
 */
function cpk_picklist_extract_request_by(array $lines): ?string
{
    for ($i = count($lines) - 1; $i >= 0; $i--) {
        $line = $lines[$i];
        if (!is_array($line)) {
            continue;
        }
        $part = strtolower(trim((string) ($line['PartNumber'] ?? '')));
        if ($part !== 'request by' && $part !== 'requestby') {
            continue;
        }
        $remark = trim((string) ($line['Remark'] ?? $line['RequestBy'] ?? $line['Request_By'] ?? ''));
        if ($remark !== '') {
            return $remark;
        }
    }

    for ($i = count($lines) - 1; $i >= 0; $i--) {
        $line = $lines[$i];
        if (!is_array($line) || !cpk_picklist_is_meta_line($line)) {
            continue;
        }
        $remark = trim((string) ($line['Remark'] ?? $line['RequestBy'] ?? $line['Request_By'] ?? ''));
        if ($remark !== '') {
            return $remark;
        }
    }

    return null;
}

/**
 * Remove non-material tail rows from picklist detail (Request By, Kitting notes, etc.).
 *
 * @param list<array<string, mixed>> $lines
 * @return list<array<string, mixed>>
 */
function cpk_picklist_strip_meta_lines(array $lines): array
{
    $out = $lines;
    while ($out !== []) {
        $last = $out[array_key_last($out)];
        if (!is_array($last) || !cpk_picklist_is_meta_line($last)) {
            break;
        }
        array_pop($out);
    }

    return array_values($out);
}

/**
 * Lines array from GetPicklistDetail response (new CPK spec).
 *
 * @return list<array<string, mixed>>
 */
function cpk_picklist_detail_lines(?array $data): array
{
    if (!is_array($data)) {
        return [];
    }

    if (isset($data['Lines']) && is_array($data['Lines'])) {
        return array_values(array_filter($data['Lines'], 'is_array'));
    }

    return cpk_as_item_list($data);
}

/**
 * True when line matches RequiredOnly rule (SAP_Info ends with _{ReqQty}, ReqQty > 0).
 */
function cpk_picklist_line_is_required(array $line): bool
{
    $sap = trim((string) ($line['SAP_Info'] ?? $line['SAPInfo'] ?? ''));

    return cpk_parse_sap_info_req_qty($sap) !== null;
}

/**
 * Client-side RequiredOnly filter (when CPK rejects RequiredOnly=true).
 *
 * @param list<array<string, mixed>> $lines
 * @return list<array<string, mixed>>
 */
function cpk_filter_picklist_required_lines(array $lines): array
{
    return array_values(array_filter($lines, static function ($line): bool {
        return is_array($line) && cpk_picklist_line_is_required($line);
    }));
}

/**
 * CPK sometimes returns ERR_CODE#00008 when RequiredOnly=true — detect for retry.
 */
function cpk_is_picklist_required_only_service_error(?string $message): bool
{
    $message = strtoupper(trim((string) ($message ?? '')));
    if ($message === '') {
        return false;
    }

    return str_contains($message, 'ERR_CODE#00008')
        || str_contains($message, 'CATCH ERROR ON SERVICE');
}

/**
 * GetPicklistDetail — picklist lines with optional RequiredOnly filter.
 *
 * @return array{
 *   ok: bool,
 *   message: string,
 *   transport_failure: bool,
 *   data: mixed,
 *   lines: list<array<string, mixed>>,
 *   request_sent: array<string, mixed>,
 *   required_only_requested: bool,
 *   required_only_filtered_locally: bool,
 *   line_count_raw: int
 * }
 */
function cpk_get_picklist_detail_call(string $picklistId, bool $requiredOnly = false): array
{
    $picklistId = trim($picklistId);
    if ($picklistId === '') {
        return [
            'ok' => false,
            'message' => 'PicklistID is required',
            'transport_failure' => false,
            'data' => ['Status' => 'E', 'Message' => 'PicklistID is required', 'Lines' => null],
            'lines' => [],
            'request_sent' => [],
            'required_only_requested' => $requiredOnly,
            'required_only_filtered_locally' => false,
            'line_count_raw' => 0,
        ];
    }

    if (strlen($picklistId) > 50) {
        return [
            'ok' => false,
            'message' => 'PicklistID must be at most 50 characters',
            'transport_failure' => false,
            'data' => ['Status' => 'E', 'Message' => 'PicklistID must be at most 50 characters', 'Lines' => null],
            'lines' => [],
            'request_sent' => [],
            'required_only_requested' => $requiredOnly,
            'required_only_filtered_locally' => false,
            'line_count_raw' => 0,
        ];
    }

    $buildRequestSent = static function (array $payload): array {
        $requestSent = $payload;
        if (!empty($_SESSION['cpk_public_uid'])) {
            $requestSent['PublicUID'] = (string) $_SESSION['cpk_public_uid'];
        }

        return $requestSent;
    };

    $evaluate = static function (array $result) use ($picklistId): array {
        $data = is_array($result['data']) ? $result['data'] : [];
        $message = (string) ($data['Message'] ?? $result['cpk_message'] ?? $result['error'] ?? 'GetPicklistDetail failed');
        $lines = cpk_picklist_detail_lines($data);
        $ok = $result['ok'] && cpk_is_success($data);

        return [
            'ok' => $ok,
            'message' => $message,
            'transport_failure' => cpk_is_transport_failure($result),
            'data' => $data,
            'lines' => $lines,
            'picklist_id' => $picklistId,
        ];
    };

    $basePayload = ['PicklistID' => $picklistId];
    $filteredLocally = false;
    $sentRequiredOnlyToCpk = false;
    $requestPayload = $basePayload;

    if ($requiredOnly) {
        $requestPayload = $basePayload + ['RequiredOnly' => true];
        $result = cpk_post_authenticated_read('GetPicklistDetail', $requestPayload);
        $sentRequiredOnlyToCpk = true;
        $eval = $evaluate($result);

        if (!$eval['ok'] || cpk_is_picklist_required_only_service_error($eval['message'])) {
            $result = cpk_post_authenticated_read('GetPicklistDetail', $basePayload);
            $requestPayload = $basePayload;
            $sentRequiredOnlyToCpk = false;
            $eval = $evaluate($result);
            if ($eval['ok']) {
                $rawLineCount = count($eval['lines']);
                $filtered = cpk_filter_picklist_required_lines($eval['lines']);
                $filteredLocally = true;
                $eval['lines'] = $filtered;
                $eval['data']['Lines'] = $filtered;
                if ($filtered === [] && $rawLineCount > 0) {
                    $eval['message'] .= ' (RequiredOnly: no lines with SAP_Info _{ReqQty})';
                }
            }
        } else {
            $rawLineCount = count($eval['lines']);
        }
    } else {
        $result = cpk_post_authenticated_read('GetPicklistDetail', $basePayload);
        $eval = $evaluate($result);
        $rawLineCount = count($eval['lines']);
    }

    if (!isset($rawLineCount)) {
        $rawLineCount = count($eval['lines']);
    }

    $requestBy = null;
    if ($eval['ok'] && $eval['lines'] !== []) {
        $requestBy = cpk_picklist_extract_request_by($eval['lines']);
        $eval['lines'] = cpk_picklist_strip_meta_lines($eval['lines']);
        if (is_array($eval['data'])) {
            $eval['data']['Lines'] = $eval['lines'];
        }
    }

    if (
        !$eval['ok']
        && cpk_is_picklist_required_only_service_error($eval['message'])
    ) {
        $eval['message'] = 'CPK GetPicklistDetail failed (ERR_CODE#00008). '
            . 'Picklist "' . $picklistId . '" appears in Open Picklists but CPK cannot return lines — contact CPK/IT.';
    }

    return [
        'ok' => $eval['ok'],
        'message' => $eval['message'],
        'transport_failure' => $eval['transport_failure'],
        'data' => $eval['data'],
        'lines' => $eval['lines'],
        'request_by' => $requestBy,
        'request_sent' => $buildRequestSent($requestPayload),
        'required_only_requested' => $requiredOnly,
        'required_only_filtered_locally' => $filteredLocally,
        'required_only_sent_to_cpk' => $sentRequiredOnlyToCpk,
        'line_count_raw' => $rawLineCount,
    ];
}
