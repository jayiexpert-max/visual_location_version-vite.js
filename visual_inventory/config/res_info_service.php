<?php

require_once __DIR__ . '/cpk_service.php';
require_once __DIR__ . '/inventory_api_service.php';

/**
 * @return array<int, string>
 */
function res_info_puid_lookup_candidates(string $puid): array
{
    $puid = trim($puid);
    if ($puid === '') {
        return [];
    }

    $stripped = cpk_normalize_puid_input($puid);

    return array_values(array_unique(array_filter([
        $puid,
        strtoupper($puid),
        $stripped,
        $stripped !== '' ? 'VL' . $stripped : '',
    ])));
}

/**
 * @return array{PUID: string, QtyRemain: mixed, Qty: mixed, StatusName?: string}|null
 */
function res_info_find_inventory_row_any(mysqli $condb, string $puid): ?array
{
    $candidates = res_info_puid_lookup_candidates($puid);
    if ($candidates === []) {
        return null;
    }

    $upper = array_map('strtoupper', $candidates);
    $placeholders = implode(',', array_fill(0, count($upper), '?'));
    $sql = "SELECT PUID, QtyRemain, Qty, StatusName FROM inventory_receive
            WHERE UPPER(PUID) IN ({$placeholders})
            ORDER BY id DESC
            LIMIT 1";

    $check = $condb->prepare($sql);
    if (!$check) {
        return null;
    }

    $types = str_repeat('s', count($upper));
    $check->bind_param($types, ...$upper);
    $check->execute();
    $row = $check->get_result()->fetch_assoc();
    $check->close();

    return $row ?: null;
}

/**
 * Find active inventory_receive row for a PUID (VL prefix / case variants).
 *
 * @return array{PUID: string, QtyRemain: mixed, Qty: mixed}|null
 */
function res_info_find_local_inventory_row(mysqli $condb, string $puid): ?array
{
    $row = res_info_find_inventory_row_any($condb, $puid);
    if (!$row) {
        return null;
    }

    $status = (string) ($row['StatusName'] ?? '');
    if (in_array($status, ['Withdrawn', 'Empty'], true)) {
        return null;
    }

    return $row;
}

/**
 * Sync local inventory_receive QtyRemain when CPK reports a different positive qty.
 */
function res_info_update_local_qty_remain(mysqli $condb, string $puid, int $qty): void
{
    if ($qty <= 0) {
        return;
    }

    $row = res_info_find_local_inventory_row($condb, $puid);
    if (!$row || !isset($row['PUID'])) {
        return;
    }

    $localQty = (int) ($row['QtyRemain'] ?? 0);
    if ($localQty === $qty) {
        return;
    }

    $dbPuid = (string) $row['PUID'];
    $stmt = $condb->prepare(
        "UPDATE inventory_receive
         SET QtyRemain = ?, Qty = GREATEST(COALESCE(Qty, 0), ?), updated_at = NOW()
         WHERE PUID = ? AND StatusName NOT IN ('Withdrawn', 'Empty')"
    );
    if (!$stmt) {
        return;
    }

    $stmt->bind_param('iis', $qty, $qty, $dbPuid);
    $stmt->execute();
    $stmt->close();
}

/**
 * Resolve QtyRemain for display: CPK when received, else local, else CPK hint.
 */
function res_info_local_qty_value(?array $localRow): ?int
{
    if (!$localRow) {
        return null;
    }

    $remain = (int) ($localRow['QtyRemain'] ?? 0);
    if ($remain > 0) {
        return $remain;
    }

    $qty = (int) ($localRow['Qty'] ?? 0);

    return $qty > 0 ? $qty : null;
}

function res_info_resolve_puid_qty_remain(
    mysqli $condb,
    string $puid,
    array $p,
    bool $cpkReceived,
    ?array $localRow,
    string $partNumber = '',
    ?int $itemRequestQty = null
): ?int {
    $cpkQty = cpk_puid_qty_remain($p);
    $localQty = res_info_local_qty_value($localRow);
    $resolved = null;
    $sourceQty = null;

    if ($cpkReceived && $cpkQty !== null && $cpkQty > 0) {
        $resolved = $cpkQty;
        $sourceQty = $cpkQty;
    } elseif ($localQty !== null) {
        $resolved = $localQty;
    } elseif ($cpkQty !== null && $cpkQty > 0) {
        $resolved = $cpkQty;
        $sourceQty = $cpkQty;
    }

    if ($resolved === null && $partNumber !== '') {
        $stationQty = inventory_cpk_station_qty_remain($puid, $partNumber);
        if ($stationQty !== null && $stationQty > 0) {
            $resolved = $stationQty;
            $sourceQty = $stationQty;
        }
    }

    if ($resolved === null && $itemRequestQty !== null && $itemRequestQty > 0) {
        $resolved = $itemRequestQty;
    }

    return $resolved;
}

/**
 * Fetch RES from CPK, cross-reference local inventory, update reservation_list.
 *
 * @return array{status: string, message?: string, data?: array, meta?: array, http_code?: int}
 */
function res_info_fetch_with_local(mysqli $condb, string $resNo): array
{
    $resNo = trim(preg_replace('/^RES/i', '', $resNo));
    if ($resNo === '') {
        return ['status' => 'error', 'message' => 'RES Number is required'];
    }

    $result = cpk_get('GET_RESNoInfo', $resNo);

    if (!$result['ok']) {
        return [
            'status' => 'error',
            'message' => $result['cpk_message'] ?? $result['error'] ?? 'ไม่สามารถเชื่อมต่อ CPK API ได้',
            'http_code' => $result['http_code'] ?? null,
        ];
    }

    $apiData = is_array($result['data']) ? cpk_normalize_res_info($result['data']) : null;

    if (!$apiData || empty($apiData['Items'])) {
        return ['status' => 'error', 'message' => 'ไม่พบข้อมูลจาก API หรือรูปแบบข้อมูลไม่ถูกต้อง'];
    }

    $listStatus = 'Pending';

    try {
        foreach ($apiData['Items'] as &$item) {
            $partNumber = trim((string) ($item['PartNumber'] ?? $item['MatNumber'] ?? $item['HanaPart'] ?? ''));
            $itemRequestQty = cpk_item_request_qty($item);

            foreach ($item['PUIDList'] as &$p) {
                $p = cpk_normalize_puid_row($p);
                if (!is_array($p)) {
                    continue;
                }

                $puid = trim((string) ($p['PUID'] ?? ''));
                $cpkReceived = cpk_is_puid_received_flag($p['Received'] ?? null);

                if ($puid !== '') {
                    $row = res_info_find_local_inventory_row($condb, $puid);
                    $p['is_already_in_db'] = (bool) $row;
                    $p['QtyRemain'] = res_info_resolve_puid_qty_remain(
                        $condb,
                        $puid,
                        $p,
                        $cpkReceived,
                        $row,
                        $partNumber,
                        $itemRequestQty
                    );
                    $p['cpk_received'] = $cpkReceived;
                    $p['is_received'] = $p['is_already_in_db'] || $cpkReceived;
                } else {
                    $p['is_already_in_db'] = false;
                    $p['cpk_received'] = $cpkReceived;
                    $p['is_received'] = $cpkReceived;
                    $p['QtyRemain'] = cpk_puid_qty_remain($p) ?? $itemRequestQty;
                }
            }
            unset($p);
        }
        unset($item);

        $resNoLog = $apiData['ReservationNo'] ?? $resNo;
        $allReceived = true;

        foreach ($apiData['Items'] as $item) {
            $puids = cpk_as_puid_list($item['PUIDList'] ?? []);
            if ($puids === []) {
                $allReceived = false;
                break;
            }
            foreach ($puids as $p) {
                if (!($p['is_received'] ?? false)) {
                    $allReceived = false;
                    break 2;
                }
            }
        }

        if ($allReceived) {
            $listStatus = 'Completed';
        }

        $ins = $condb->prepare(
            "INSERT INTO reservation_list (res_no, status, req_date)
             VALUES (?, ?, NOW())
             ON DUPLICATE KEY UPDATE status = VALUES(status)"
        );
        $ins->bind_param('ss', $resNoLog, $listStatus);
        $ins->execute();
        $ins->close();
    } catch (Exception $e) {
        $apiData['local_db_error'] = $e->getMessage();
    }

    $puidCount = 0;
    foreach ($apiData['Items'] as $item) {
        $puidCount += count($item['PUIDList'] ?? []);
    }

    $isEN = (($_SESSION['lang'] ?? 'th') === 'en');

    return [
        'status' => 'success',
        'message' => $isEN
            ? "RES {$resNoLog} status refreshed ({$listStatus})"
            : "อัปเดตสถานะ RES {$resNoLog} แล้ว ({$listStatus})",
        'data' => $apiData,
        'meta' => [
            'item_count' => count($apiData['Items']),
            'puid_count' => $puidCount,
            'list_status' => $listStatus,
        ],
    ];
}

/**
 * Save one RES PUID into local warehouse (skip CPK — already received there).
 *
 * @param array<string, mixed> $data
 * @return array{status: string, message?: string, already_received?: bool}
 */
function res_info_save_puid_local(mysqli $condb, array $data, string $reservationNo): array
{
    $puid = trim((string) ($data['PUID'] ?? ''));
    if ($puid === '') {
        return ['status' => 'error', 'message' => 'PUID is required'];
    }

    if (empty($data['slot_id'])) {
        return ['status' => 'error', 'message' => 'Storage location (slot_id) is required'];
    }

    $existingRow = res_info_find_inventory_row_any($condb, $puid);
    if ($existingRow) {
        $existingStatus = (string) ($existingRow['StatusName'] ?? '');
        if (in_array($existingStatus, ['Withdrawn', 'Empty'], true)) {
            return [
                'status' => 'success',
                'message' => 'PUID already withdrawn — skipped',
                'already_withdrawn' => true,
            ];
        }

        return [
            'status' => 'success',
            'message' => 'PUID already in local warehouse',
            'already_received' => true,
        ];
    }

    $condb->begin_transaction();

    try {
        $now = date('Y-m-d H:i:s');
        $sqlRec = "INSERT INTO inventory_receive (
            ReceiveDate, PUID, ReservationNo, IM, Customer, HanaPart, Description, MnfPartNo,
            LotNo, DateCode, BinSize, Qty, QtyRemain, McID, MachineName,
            StatusName, ExpirationDate, OldIM, Remark, Loc_Shelf, Loc_Level, Loc_Box,
            ExpireDate_RoomTemp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            QtyRemain = VALUES(QtyRemain),
            StatusName = VALUES(StatusName),
            updated_at = '$now'";

        $stmtRec = $condb->prepare($sqlRec);
        if (!$stmtRec) {
            throw new Exception('Prepare inventory_receive failed');
        }

        $receiveDate = !empty($data['ReceiveDate']) ? (string) $data['ReceiveDate'] : $now;
        $qty = (int) ($data['Qty'] ?? 0);
        $qtyRemain = (int) ($data['QtyRemain'] ?? $qty);
        $mcId = !empty($data['McID']) ? (int) $data['McID'] : null;
        $status = (string) ($data['StatusName'] ?? 'Available');
        $expDate = !empty($data['ExpirationDate']) ? (string) $data['ExpirationDate'] : null;
        $roomExpDate = !empty($data['ExpireDate_RoomTemp']) ? (string) $data['ExpireDate_RoomTemp'] : null;

        $stmtRec->bind_param(
            'ssssssssssiiissssssssss',
            $receiveDate,
            $puid,
            $reservationNo,
            $data['IM'],
            $data['Customer'],
            $data['HanaPart'],
            $data['Description'],
            $data['MnfPartNo'],
            $data['LotNo'],
            $data['DateCode'],
            $data['BinSize'],
            $qty,
            $qtyRemain,
            $mcId,
            $data['MachineName'],
            $status,
            $expDate,
            $data['OldIM'],
            $data['Remark'],
            $data['Loc_Shelf'],
            $data['Loc_Level'],
            $data['Loc_Box'],
            $roomExpDate
        );

        if (!$stmtRec->execute()) {
            throw new Exception('Insert inventory_receive failed');
        }
        $insertedNew = ((int) $stmtRec->affected_rows) === 1;
        $stmtRec->close();

        if (!$insertedNew) {
            $condb->commit();

            return [
                'status' => 'success',
                'message' => 'PUID already in local warehouse',
                'already_received' => true,
            ];
        }

        $slotId = (int) $data['slot_id'];
        $hanaPart = (string) ($data['HanaPart'] ?? '');

        $chkP = $condb->prepare('SELECT id FROM products WHERE slot_id = ? AND name = ? LIMIT 1');
        $chkP->bind_param('is', $slotId, $hanaPart);
        $chkP->execute();
        $resP = $chkP->get_result()->fetch_assoc();
        $chkP->close();

        $logProductId = 0;
        if ($resP) {
            $logProductId = (int) $resP['id'];
            $updP = $condb->prepare('UPDATE products SET qty = qty + 1 WHERE id = ?');
            $updP->bind_param('i', $logProductId);
            $updP->execute();
            $updP->close();
        } else {
            $insP = $condb->prepare('INSERT INTO products (slot_id, name, qty) VALUES (?, ?, 1)');
            $insP->bind_param('is', $slotId, $hanaPart);
            $insP->execute();
            $logProductId = (int) $condb->insert_id;
            $insP->close();
        }

        if ($logProductId > 0) {
            $safePuid = str_replace('|', '-', $puid);
            $logAction = 'res_receive|' . $qtyRemain . '|' . $safePuid;
            $userId = (int) ($_SESSION['user_id'] ?? 0);
            $logRemark = $reservationNo !== ''
                ? '[RES: ' . str_replace('|', '-', $reservationNo) . ']'
                : '';

            $logSql = 'INSERT INTO stock_logs (product_id, user_id, action, quantity, created_at, remark)
                       VALUES (?, ?, ?, ?, ?, ?)';
            $logStmt = $condb->prepare($logSql);
            $logStmt->bind_param('iisiss', $logProductId, $userId, $logAction, $qty, $now, $logRemark);
            $logStmt->execute();
            $logStmt->close();
        }

        $condb->commit();

        return ['status' => 'success', 'message' => 'Saved to local warehouse'];
    } catch (Exception $e) {
        $condb->rollback();

        return ['status' => 'error', 'message' => $e->getMessage()];
    }
}

/**
 * Batch-save CPK-received PUIds that are not yet in local warehouse.
 *
 * @return array{status: string, message: string, data?: array, meta?: array}
 */
function res_info_sync_local_from_cpk(mysqli $condb, string $resNo): array
{
    $fetch = res_info_fetch_with_local($condb, $resNo);
    if ($fetch['status'] !== 'success' || !is_array($fetch['data'])) {
        return $fetch;
    }

    $apiData = $fetch['data'];
    $resNoLog = trim((string) ($apiData['ReservationNo'] ?? $resNo));
    $pending = [];

    foreach ($apiData['Items'] ?? [] as $item) {
        if (!is_array($item)) {
            continue;
        }

        $partNumber = trim((string) ($item['PartNumber'] ?? $item['MatNumber'] ?? $item['HanaPart'] ?? ''));
        foreach (cpk_as_puid_list($item['PUIDList'] ?? []) as $p) {
            if (!is_array($p)) {
                continue;
            }

            $puid = trim((string) ($p['PUID'] ?? ''));
            if ($puid === '') {
                continue;
            }

            $cpkReceived = (bool) ($p['cpk_received'] ?? cpk_is_puid_received_flag($p['Received'] ?? null));
            $localReceived = (bool) ($p['is_already_in_db'] ?? false);

            if ($cpkReceived && !$localReceived) {
                $anyRow = res_info_find_inventory_row_any($condb, $puid);
                $anyStatus = (string) ($anyRow['StatusName'] ?? '');
                if ($anyRow && in_array($anyStatus, ['Withdrawn', 'Empty'], true)) {
                    continue;
                }

                $pending[] = [
                    'puid' => $puid,
                    'part_number' => $partNumber,
                    'cpk_row' => $p,
                ];
            }
        }
    }

    $isEN = (($_SESSION['lang'] ?? 'th') === 'en');

    if ($pending === []) {
        return [
            'status' => 'success',
            'message' => $isEN
                ? "RES {$resNoLog}: all CPK-received PUIds are already in local warehouse"
                : "RES {$resNoLog}: CPK รับแล้วทุก PUID — มีในคลังครบแล้ว",
            'data' => $apiData,
            'meta' => [
                'saved' => 0,
                'already' => 0,
                'failed' => 0,
                'pending' => 0,
            ],
        ];
    }

    $saved = 0;
    $already = 0;
    $failed = 0;
    $errors = [];

    foreach ($pending as $row) {
        $puid = $row['puid'];
        $partNumber = $row['part_number'];
        $cpkRow = $row['cpk_row'];

        $inv = inventory_fetch_by_puid($condb, $puid, $partNumber, []);
        if (($inv['status'] ?? '') !== 'success' || empty($inv['data']) || empty($inv['data']['slot_id'])) {
            $failed++;
            $errors[] = [
                'puid' => $puid,
                'message' => (string) ($inv['message'] ?? 'Cannot load material/location data'),
            ];
            continue;
        }

        $data = $inv['data'];
        $data['PUID'] = $puid;
        $data['ReservationNo'] = $resNoLog;

        $cpkQty = cpk_puid_qty_remain($cpkRow);
        if ($cpkQty !== null && $cpkQty > 0) {
            $data['QtyRemain'] = $cpkQty;
            if (empty($data['Qty'])) {
                $data['Qty'] = $cpkQty;
            }
        }

        $save = res_info_save_puid_local($condb, $data, $resNoLog);
        if (($save['status'] ?? '') === 'success') {
            if (!empty($save['already_received']) || !empty($save['already_withdrawn'])) {
                $already++;
            } else {
                $saved++;
            }
            continue;
        }

        $failed++;
        $errors[] = [
            'puid' => $puid,
            'message' => (string) ($save['message'] ?? 'Save failed'),
        ];
    }

    $refreshed = res_info_fetch_with_local($condb, $resNo);

    if ($failed > 0) {
        $message = $isEN
            ? "RES {$resNoLog}: saved {$saved}, already {$already}, failed {$failed}"
            : "RES {$resNoLog}: บันทึก {$saved}, มีแล้ว {$already}, ล้มเหลว {$failed}";

        return [
            'status' => 'error',
            'message' => $message,
            'data' => is_array($refreshed['data'] ?? null) ? $refreshed['data'] : $apiData,
            'meta' => [
                'saved' => $saved,
                'already' => $already,
                'failed' => $failed,
                'pending' => count($pending),
                'errors' => $errors,
            ],
        ];
    }

    $message = $saved > 0
        ? ($isEN
            ? "RES {$resNoLog}: saved {$saved} PUID(s) to local warehouse"
            : "RES {$resNoLog}: บันทึกเข้าคลัง {$saved} PUID")
        : ($isEN
            ? "RES {$resNoLog}: all CPK-received PUIds are already in local warehouse"
            : "RES {$resNoLog}: มีในคลังครบแล้ว");

    if ($already > 0 && $saved === 0) {
        $message = $isEN
            ? "RES {$resNoLog}: {$already} PUID(s) already in local warehouse"
            : "RES {$resNoLog}: มีในคลังแล้ว {$already} PUID";
    }

    return [
        'status' => 'success',
        'message' => $message,
        'data' => is_array($refreshed['data'] ?? null) ? $refreshed['data'] : $apiData,
        'meta' => [
            'saved' => $saved,
            'already' => $already,
            'failed' => $failed,
            'pending' => count($pending),
            'errors' => $errors,
            'list_status' => $refreshed['meta']['list_status'] ?? null,
        ],
    ];
}
