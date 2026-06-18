<?php

require_once __DIR__ . '/cpk_service.php';
require_once __DIR__ . '/inventory_api_service.php';

const STATION_INVEN_CACHE_TTL = 30;
const STATION_INVEN_COOLDOWN_SEC = 3;

/**
 * Drop PHP session cache for StationInvenCheck (after CPK qty update).
 */
function station_inven_clear_session_cache(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        return;
    }

    unset($_SESSION['cpk_station_inven']);
}

/**
 * @return list<array<string, mixed>>
 */
function station_inven_normalize_items($items): array
{
    if ($items === null || $items === '') {
        return [];
    }

    if (!is_array($items)) {
        return [];
    }

    if ($items === [] || array_is_list($items)) {
        return array_values(array_filter($items, 'is_array'));
    }

    foreach (['Item', 'Items', 'InventoryItem'] as $key) {
        if (isset($items[$key])) {
            return station_inven_normalize_items($items[$key]);
        }
    }

    if (isset($items['PUID']) || isset($items['PartNumber'])) {
        return [$items];
    }

    return array_values(array_filter($items, 'is_array'));
}

function station_inven_cache_key(int $nearExpiryDays, string $partNumber): string
{
    return hash('sha256', $nearExpiryDays . '|' . strtoupper(trim($partNumber)));
}

function station_inven_expire_to_sql(?string $expireDate): ?string
{
    $raw = trim((string) ($expireDate ?? ''));
    if ($raw === '') {
        return null;
    }

    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $raw, $m)) {
        return sprintf('%s-%s-%s', $m[1], $m[2], $m[3]);
    }

    if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $raw, $m)) {
        return sprintf('%s-%s-%s', $m[1], $m[2], $m[3]);
    }

    $ts = strtotime($raw);

    return $ts !== false ? date('Y-m-d', $ts) : null;
}

/**
 * Map check_expiration filters to CPK StationInvenCheck body (page display filters).
 *
 * @return array{NearExpiryDays:int,PartNumber:string}
 */
function station_inven_filters_from_request(string $search, string $statusFilter): array
{
    $nearExpiryDays = 0;
    if (in_array($statusFilter, ['all', 'soon'], true)) {
        $nearExpiryDays = 7;
    }

    return [
        'NearExpiryDays' => $nearExpiryDays,
        'PartNumber' => station_inven_part_number_from_search($search),
    ];
}

/**
 * CPK filters for central sync — only near-expiry window (not full station stock).
 *
 * @return array{NearExpiryDays:int,PartNumber:string}
 */
function station_inven_central_sync_filters(string $search): array
{
    return [
        'NearExpiryDays' => expiration_sync_near_days(),
        'PartNumber' => station_inven_part_number_from_search($search),
    ];
}

function station_inven_part_number_from_search(string $search): string
{
    $search = trim($search);
    if ($search === '' || str_contains($search, '%') || str_contains($search, ' ')) {
        return '';
    }

    if (strlen($search) >= 10 || preg_match('/IST|COM|CAP|RES/i', $search)) {
        return $search;
    }

    return '';
}

/**
 * @return array{status:string,message:string,skipped?:bool,cached?:bool,updated?:int,matched?:int,total?:int,cpk?:array}
 */
function station_inven_fetch_from_cpk(int $nearExpiryDays, string $partNumber = ''): array
{
    if (cpk_mcid() === null) {
        return [
            'status' => 'error',
            'message' => cpk_mcid_missing_message(),
        ];
    }

    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $cacheKey = station_inven_cache_key($nearExpiryDays, $partNumber);
    $now = time();
    $store = &$_SESSION['cpk_station_inven'];

    if (!empty($store['cache'][$cacheKey]) && ($now - (int) $store['cache'][$cacheKey]['time']) < STATION_INVEN_CACHE_TTL) {
        return array_merge($store['cache'][$cacheKey]['result'], ['cached' => true]);
    }

    if (!empty($store['last_call'])
        && $store['last_call']['key'] === $cacheKey
        && ($now - (int) $store['last_call']['time']) < STATION_INVEN_COOLDOWN_SEC
    ) {
        if (!empty($store['cache'][$cacheKey])) {
            return array_merge($store['cache'][$cacheKey]['result'], ['cached' => true, 'skipped' => true]);
        }

        return [
            'status' => 'skipped',
            'message' => 'CPK cooldown — using local data',
            'skipped' => true,
        ];
    }

    $body = ['NearExpiryDays' => max(0, $nearExpiryDays)];
    if ($partNumber !== '') {
        $body['PartNumber'] = $partNumber;
    }

    $result = cpk_post_authenticated_read('StationInvenCheck', $body);
    $store['last_call'] = ['key' => $cacheKey, 'time' => $now];

    if (!$result['ok'] || !is_array($result['data'])) {
        $message = $result['cpk_message'] ?? $result['error'] ?? 'StationInvenCheck failed';
        if (cpk_is_too_many_requests_message($message)) {
            if (!empty($store['cache'][$cacheKey])) {
                return array_merge($store['cache'][$cacheKey]['result'], ['cached' => true, 'skipped' => true]);
            }

            return [
                'status' => 'skipped',
                'message' => $message,
                'skipped' => true,
            ];
        }

        return [
            'status' => 'error',
            'message' => $message,
            'cpk' => is_array($result['data']) ? $result['data'] : null,
        ];
    }

    $payload = [
        'status' => 'success',
        'message' => (string) ($result['data']['Message'] ?? 'OK'),
        'items' => station_inven_normalize_items($result['data']['Items'] ?? []),
        'total' => (int) ($result['data']['TotalCount'] ?? 0),
        'cpk' => $result['data'],
    ];

    $store['cache'][$cacheKey] = ['time' => $now, 'result' => $payload];

    return $payload;
}

function cpk_is_too_many_requests_message(?string $message): bool
{
    if ($message === null || $message === '') {
        return false;
    }

    $m = strtolower($message);

    return strpos($m, 'too many requests') !== false
        || strpos($m, 'wait a moment') !== false;
}

/**
 * Apply CPK station inventory rows to inventory_receive.
 *
 * @return array{status:string,message:string,updated:int,matched:int,total:int,skipped?:bool,cached?:bool}
 */
function station_inven_sync_to_db(mysqli $condb, string $search = '', string $statusFilter = 'all'): array
{
    unset($statusFilter);
    $filters = station_inven_central_sync_filters($search);
    $fetch = station_inven_fetch_from_cpk($filters['NearExpiryDays'], $filters['PartNumber']);

    if ($fetch['status'] === 'skipped') {
        return [
            'status' => 'skipped',
            'message' => $fetch['message'],
            'updated' => 0,
            'matched' => 0,
            'total' => 0,
            'skipped' => true,
            'cached' => !empty($fetch['cached']),
        ];
    }

    if ($fetch['status'] !== 'success') {
        return [
            'status' => 'error',
            'message' => $fetch['message'] ?? 'StationInvenCheck failed',
            'updated' => 0,
            'matched' => 0,
            'total' => 0,
        ];
    }

    $items = $fetch['items'] ?? [];
    $updated = 0;
    $matched = 0;
    $skippedScope = 0;

    $stmt = $condb->prepare(
        'UPDATE inventory_receive SET
            QtyRemain = ?,
            Qty = CASE WHEN ? > 0 THEN ? ELSE Qty END,
            HanaPart = CASE WHEN ? <> "" THEN ? ELSE HanaPart END,
            LotNo = CASE WHEN ? <> "" THEN ? ELSE LotNo END,
            ExpirationDate = COALESCE(?, ExpirationDate),
            Remark = CASE WHEN ? <> "" THEN ? ELSE Remark END,
            updated_at = NOW()
        WHERE PUID = ?
          AND StatusName NOT IN ("Withdrawn", "Empty")'
    );

    if (!$stmt) {
        return [
            'status' => 'error',
            'message' => 'Database prepare failed: ' . $condb->error,
            'updated' => 0,
            'matched' => 0,
            'total' => count($items),
        ];
    }

    foreach ($items as $row) {
        $puid = trim((string) ($row['PUID'] ?? ''));
        if ($puid === '') {
            continue;
        }

        $effectiveRemain = cpk_station_row_effective_remain($row);
        $qtyRemain = $effectiveRemain ?? 0;
        $originalQty = (int) ($row['OriginalQty'] ?? $row['Qty'] ?? 0);
        if ($originalQty <= 0 && $qtyRemain > 0) {
            $originalQty = $qtyRemain;
        }
        $partNumber = trim((string) ($row['PartNumber'] ?? ''));
        $batchNumber = trim((string) ($row['BatchNumber'] ?? ''));
        $locationInfo = trim((string) ($row['LocationInfo'] ?? ''));
        $expirationSql = station_inven_expire_to_sql($row['ExpireDate'] ?? null);

        if (!expiration_date_in_sync_scope($expirationSql)) {
            $skippedScope++;
            continue;
        }

        $stmt->bind_param(
            'iiissssssss',
            $qtyRemain,
            $originalQty,
            $originalQty,
            $partNumber,
            $partNumber,
            $batchNumber,
            $batchNumber,
            $expirationSql,
            $locationInfo,
            $locationInfo,
            $puid
        );
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            $updated++;
        }

        if ($stmt->errno === 0) {
            $matched++;
        }
    }

    $stmt->close();

    $cached = !empty($fetch['cached']);
    $synced = count($items) - $skippedScope;
    $scopeLabel = 'expired + ' . expiration_sync_near_days() . 'd';
    $message = $cached
        ? "CPK cache: {$updated} updated ({$scopeLabel}, {$synced}/" . count($items) . ' from API)'
        : "CPK: {$updated} updated ({$scopeLabel}, {$synced}/" . count($items) . ' from API)';

    return [
        'status' => 'success',
        'message' => $message,
        'updated' => $updated,
        'matched' => $matched,
        'total' => $synced,
        'skipped_scope' => $skippedScope,
        'cached' => $cached,
    ];
}
