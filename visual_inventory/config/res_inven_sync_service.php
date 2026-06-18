<?php

require_once __DIR__ . '/cpk_service.php';
require_once __DIR__ . '/station_inven_sync_service.php';
require_once __DIR__ . '/inventory_api_service.php';

/**
 * Collect PUID rows from normalized GET_RESNoInfo payload.
 *
 * @return list<array{puid:string,part_number:string,qty_remain:int,expire:?string,batch:string,item_no:string}>
 */
function res_inven_extract_puid_rows(array $resPayload): array
{
    $rows = [];
    foreach (cpk_as_item_list($resPayload['Items'] ?? []) as $item) {
        if (!is_array($item)) {
            continue;
        }

        $partNumber = trim((string) ($item['PartNumber'] ?? $item['MatNumber'] ?? $item['HanaPart'] ?? ''));
        $itemNo = trim((string) ($item['ItemNo'] ?? $item['ItemNumber'] ?? ''));

        foreach (cpk_as_puid_list($item['PUIDList'] ?? []) as $p) {
            if (!is_array($p)) {
                continue;
            }

            $puid = trim((string) ($p['PUID'] ?? ''));
            if ($puid === '') {
                continue;
            }

            $expireRaw = $p['ExpireDate'] ?? $p['ExpirationDate'] ?? $p['ExpDate'] ?? null;
            $qtyRemain = (int) ($p['QtyRemain'] ?? $p['Quantity'] ?? $p['Qty'] ?? 0);

            $rows[] = [
                'puid' => $puid,
                'part_number' => $partNumber,
                'qty_remain' => $qtyRemain,
                'expire' => station_inven_expire_to_sql(is_string($expireRaw) || is_numeric($expireRaw) ? (string) $expireRaw : null),
                'batch' => trim((string) ($p['BatchNumber'] ?? $p['LotNo'] ?? '')),
                'item_no' => $itemNo,
            ];
        }
    }

    return $rows;
}

/**
 * @param list<string> $puids
 * @return array<string, string> PUID => Y-m-d expiration
 */
function res_inven_fetch_local_expirations(mysqli $condb, array $puids): array
{
    $map = [];
    $puids = array_values(array_unique(array_filter(array_map('trim', $puids))));
    if ($puids === []) {
        return $map;
    }

    foreach (array_chunk($puids, 120) as $chunk) {
        $placeholders = implode(',', array_fill(0, count($chunk), '?'));
        $sql = "SELECT PUID, ExpirationDate FROM inventory_receive
            WHERE PUID IN ($placeholders)
              AND QtyRemain > 0
              AND StatusName NOT IN ('Withdrawn', 'Empty')";
        $stmt = $condb->prepare($sql);
        if (!$stmt) {
            continue;
        }

        $types = str_repeat('s', count($chunk));
        $stmt->bind_param($types, ...$chunk);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($local = $result->fetch_assoc()) {
            $exp = station_inven_expire_to_sql((string) ($local['ExpirationDate'] ?? ''));
            if ($exp !== null) {
                $map[(string) $local['PUID']] = $exp;
            }
        }
        $stmt->close();
    }

    return $map;
}

/**
 * Keep only PUID rows in expired / within-7-days scope (CPK date or local warehouse date).
 *
 * @param list<array{puid:string,part_number:string,qty_remain:int,expire:?string,batch:string,item_no:string}> $rows
 * @return list<array{puid:string,part_number:string,qty_remain:int,expire:?string,batch:string,item_no:string}>
 */
function res_inven_filter_sync_scope(mysqli $condb, array $rows): array
{
    if ($rows === []) {
        return [];
    }

    $scoped = [];
    $needLocal = [];

    foreach ($rows as $row) {
        $expire = $row['expire'] ?? null;
        if (expiration_date_in_sync_scope($expire)) {
            $scoped[] = $row;
            continue;
        }
        $needLocal[$row['puid']] = $row;
    }

    if ($needLocal === []) {
        return $scoped;
    }

    $localMap = res_inven_fetch_local_expirations($condb, array_keys($needLocal));
    foreach ($needLocal as $puid => $row) {
        $localExp = $localMap[$puid] ?? null;
        if ($localExp !== null && expiration_date_in_sync_scope($localExp)) {
            $row['expire'] = $localExp;
            $scoped[] = $row;
        }
    }

    return $scoped;
}

/**
 * Sync expiration/qty from CPK GET_RESNoInfo for one reservation — updates local inventory_receive.
 *
 * @return array{status:string,message:string,res_no:string,updated:int,matched:int,checked:int,total:int,cpk?:array}
 */
function res_inven_sync_to_db(mysqli $condb, string $resNo): array
{
    $resNo = trim($resNo);
    if ($resNo === '') {
        return [
            'status' => 'error',
            'message' => 'RES number is required',
            'res_no' => '',
            'updated' => 0,
            'matched' => 0,
            'checked' => 0,
            'total' => 0,
        ];
    }

    $result = cpk_get('GET_RESNoInfo', $resNo);
    if (!$result['ok'] || !is_array($result['data'])) {
        return [
            'status' => 'error',
            'message' => $result['cpk_message'] ?? $result['error'] ?? 'GET_RESNoInfo failed',
            'res_no' => $resNo,
            'updated' => 0,
            'matched' => 0,
            'checked' => 0,
            'total' => 0,
            'cpk' => is_array($result['data']) ? $result['data'] : null,
        ];
    }

    $normalized = cpk_normalize_res_info($result['data']);
    $allPuidRows = res_inven_extract_puid_rows($normalized);
    $puidRows = res_inven_filter_sync_scope($condb, $allPuidRows);
    $skippedScope = count($allPuidRows) - count($puidRows);

    if ($puidRows === []) {
        return [
            'status' => 'success',
            'message' => 'RES ' . $resNo . ': no PUID in expired/7-day scope ('
                . count($allPuidRows) . ' in RES, ' . $skippedScope . ' skipped)',
            'res_no' => $resNo,
            'updated' => 0,
            'matched' => 0,
            'checked' => count($allPuidRows),
            'total' => 0,
            'skipped_scope' => $skippedScope,
        ];
    }

    $stmt = $condb->prepare(
        'UPDATE inventory_receive SET
            ReservationNo = ?,
            QtyRemain = CASE WHEN ? > 0 THEN ? ELSE QtyRemain END,
            Qty = CASE WHEN ? > 0 THEN ? ELSE Qty END,
            HanaPart = CASE WHEN ? <> "" THEN ? ELSE HanaPart END,
            LotNo = CASE WHEN ? <> "" THEN ? ELSE LotNo END,
            ExpirationDate = COALESCE(?, ExpirationDate),
            updated_at = NOW()
        WHERE PUID = ?
          AND StatusName NOT IN ("Withdrawn", "Empty")'
    );

    if (!$stmt) {
        return [
            'status' => 'error',
            'message' => 'Database prepare failed: ' . $condb->error,
            'res_no' => $resNo,
            'updated' => 0,
            'matched' => 0,
            'checked' => count($puidRows),
            'total' => count($puidRows),
        ];
    }

    $updated = 0;
    $matched = 0;

    foreach ($puidRows as $row) {
        $puid = $row['puid'];
        $partNumber = $row['part_number'];
        $qtyRemain = $row['qty_remain'];
        $batch = $row['batch'];
        $expirationSql = $row['expire'];

        $stmt->bind_param(
            'siiiissssss',
            $resNo,
            $qtyRemain,
            $qtyRemain,
            $qtyRemain,
            $qtyRemain,
            $partNumber,
            $partNumber,
            $batch,
            $batch,
            $expirationSql,
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

    $scopeLabel = 'expired + ' . expiration_sync_near_days() . 'd';

    return [
        'status' => 'success',
        'message' => 'RES ' . $resNo . ': ' . $updated . ' updated (' . $scopeLabel . ', '
            . count($puidRows) . '/' . count($allPuidRows) . ' PUIDs in scope)',
        'res_no' => $resNo,
        'updated' => $updated,
        'matched' => $matched,
        'checked' => count($allPuidRows),
        'total' => count($puidRows),
        'skipped_scope' => $skippedScope,
    ];
}
