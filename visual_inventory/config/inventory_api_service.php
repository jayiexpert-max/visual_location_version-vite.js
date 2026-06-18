<?php

require_once __DIR__ . '/helpers.php';

function inventory_normalize_puid(string $puid): string
{
    return (string) preg_replace('/^VL/', '', strtoupper(trim($puid)));
}

/**
 * PUID variants for DB lookup (VL prefix / case).
 *
 * @return list<string>
 */
function inventory_puid_lookup_candidates(string $puid): array
{
    $puid = trim($puid);
    if ($puid === '') {
        return [];
    }

    $upper = strtoupper($puid);
    $stripped = inventory_normalize_puid($puid);

    return array_values(array_unique(array_filter([
        $puid,
        $upper,
        $stripped,
        $stripped !== '' ? 'VL' . $stripped : '',
    ])));
}

function inventory_normalize_part(string $part): string
{
    return strtoupper(trim($part));
}

function inventory_parts_match(string $a, string $b): bool
{
    return inventory_normalize_part($a) === inventory_normalize_part($b);
}

/**
 * When true, PUID fetch also calls CPK StationInvenCheck for qty enrichment (slow).
 */
function inventory_fetch_cpk_station_enrich(): bool
{
    return strtolower(trim((string) (env('INVENTORY_FETCH_CPK_STATION', 'false') ?? 'false'))) === 'true';
}

/**
 * Full CPK StationInvenCheck row for one PUID (if present at station).
 *
 * @return array<string, mixed>|null
 */
function inventory_cpk_station_row_for_puid(string $puid, string $partNumber = ''): ?array
{
    $puid = inventory_normalize_puid($puid);
    if ($puid === '') {
        return null;
    }

    if (!function_exists('cpk_mcid')) {
        require_once __DIR__ . '/cpk_service.php';
    }

    if (cpk_mcid() === null) {
        return null;
    }

    if (!function_exists('station_inven_fetch_from_cpk')) {
        require_once __DIR__ . '/station_inven_sync_service.php';
    }

    $fetch = station_inven_fetch_from_cpk(0, trim($partNumber));
    if (($fetch['status'] ?? '') !== 'success' || empty($fetch['items'])) {
        return null;
    }

    foreach ($fetch['items'] as $row) {
        if (!is_array($row)) {
            continue;
        }
        if (strcasecmp(trim((string) ($row['PUID'] ?? '')), $puid) === 0) {
            return $row;
        }
    }

    return null;
}

/**
 * Fetch PUID data from PDService and resolve local storage location.
 *
 * @param array{api_only?: bool} $options
 *   api_only=true — add_stock/handheld: always PDService GET, no local/CPK fallback for display qty
 * @return array{status: string, message?: string, data?: array, debug?: array}
 */
function inventory_fetch_by_puid(mysqli $condb, string $puid, string $hana = '', array $options = []): array
{
    $puid = inventory_normalize_puid($puid);
    $hana = trim($hana);
    $apiOnly = !empty($options['api_only']);

    if ($puid === '') {
        return ['status' => 'error', 'message' => 'PUID is required'];
    }

    $apiUrl = pdservice_puid_url($puid);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, pdservice_curl_timeout());
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, pdservice_curl_connect_timeout());
    $jsonContent = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlErrno = curl_errno($ch);
    curl_close($ch);

    if ($jsonContent === false || $httpCode !== 200) {
        $isEN = (__('logout') == 'Logout');
        $lanHint = $isEN
            ? 'Check LAN cable/Wi‑Fi and PDService on the factory network.'
            : 'ตรวจสอบสาย LAN/Wi‑Fi และ PDService ในเครือข่ายโรงงาน';
        $timeoutHint = ($curlErrno === 28 || $curlErrno === CURLE_OPERATION_TIMEDOUT)
            ? ($isEN ? ' PDService timed out.' : ' PDService ไม่ตอบสนอง (timeout).')
            : ($isEN ? ' PDService unreachable.' : ' เชื่อมต่อ PDService ไม่ได้.');

        if (!$apiOnly) {
            $local = inventory_fetch_local_fallback($condb, $puid, $hana);
            if ($local['status'] === 'success') {
                $local['pdservice_offline'] = true;
                $local['pdservice_warning'] = ($isEN
                    ? 'PDService unavailable — using local warehouse data.'
                    : 'เชื่อมต่อ PDService ไม่ได้ — ใช้ข้อมูลจากคลังในระบบแทน');
                $local['debug'] = [
                    'http_code' => $httpCode,
                    'curl_error' => $curlError,
                    'curl_errno' => $curlErrno,
                    'api_url' => $apiUrl,
                ];
                return $local;
            }

            $cpk = inventory_fetch_cpk_station_fallback($condb, $puid, $hana);
            if ($cpk['status'] === 'success') {
                $cpk['pdservice_offline'] = true;
                $cpk['data_source'] = 'cpk';
                $cpk['pdservice_warning'] = ($isEN
                    ? 'PDService unavailable — using CPK station inventory.'
                    : 'เชื่อมต่อ PDService ไม่ได้ — ใช้ข้อมูลจาก CPK StationInvenCheck');
                $cpk['debug'] = [
                    'http_code' => $httpCode,
                    'curl_error' => $curlError,
                    'curl_errno' => $curlErrno,
                    'api_url' => $apiUrl,
                ];
                return $cpk;
            }
        }

        $cpkHint = $apiOnly
            ? ($isEN ? ' PDService API is required for receive.' : ' ต้องดึงจาก PDService API')
            : ($isEN ? ' PDService and CPK/local lookup failed.' : ' ค้นหาจาก PDService และ CPK/คลังในระบบไม่สำเร็จ');

        return [
            'status' => 'error',
            'message' => ($isEN ? 'Cannot reach PDService API.' : 'เชื่อมต่อ PDService ไม่ได้')
                . $timeoutHint . $cpkHint . ' ' . $lanHint,
            'debug' => [
                'http_code' => $httpCode,
                'curl_error' => $curlError,
                'curl_errno' => $curlErrno,
                'api_url' => $apiUrl,
            ],
        ];
    }

    $apiData = json_decode($jsonContent, true);
    if (!$apiData || !is_array($apiData)) {
        return ['status' => 'error', 'message' => 'ไม่พบข้อมูลจาก API หรือรูปแบบข้อมูลไม่ถูกต้อง'];
    }

    $pdserviceQty = inventory_parse_pdservice_qty_fields($apiData);

    $found = [
        'ReceiveDate' => $apiData['ReceiveDate'] ?? date('Y-m-d H:i:s'),
        'PUID' => $apiData['PUID'] ?? $puid,
        'IM' => $apiData['IM'] ?? '',
        'Customer' => $apiData['Customer'] ?? '',
        'HanaPart' => $apiData['HanaPart'] ?? '',
        'Description' => $apiData['Description'] ?? '',
        'MnfPartNo' => $apiData['MnfPartNo'] ?? '',
        'LotNo' => $apiData['LotNo'] ?? '',
        'DateCode' => $apiData['DateCode'] ?? '',
        'BinSize' => $apiData['BinSize'] ?? '',
        'Qty' => (int) ($apiData['Qty'] ?? 0),
        'QtyRemain' => $pdserviceQty['usable'],
        'QtyRemain_pdservice_raw' => $pdserviceQty['raw'],
        'McID' => $apiData['McID'] ?? '',
        'MachineName' => $apiData['MachineName'] ?? '',
        'StatusName' => $apiData['StatusName'] ?? '',
        'ExpirationDate' => $apiData['ExpirationDate'] ?? '',
        'OldIM' => $apiData['OldIM'] ?? '',
        'Remark' => $apiData['Remark'] ?? '',
        'Loc_Shelf' => $apiData['Loc_Shelf'] ?? '',
        'Loc_Level' => $apiData['Loc_Level'] ?? '',
        'Loc_Box' => $apiData['Loc_Box'] ?? '',
        'ExpireDate_RoomTemp' => $apiData['ExpireDate_RoomTemp'] ?? '',
    ];

    if ($hana !== '' && !inventory_parts_match($found['HanaPart'] ?? '', $hana)) {
        return [
            'status' => 'error',
            'message' => "ข้อมูล PUID นี้เป็นของพาร์ท <b>{$found['HanaPart']}</b> (ไม่ตรงกับ <b>$hana</b>)",
        ];
    }

    $shelf = $found['Loc_Shelf'];
    $level_no = intval($found['Loc_Level']);
    $box_code = $found['Loc_Box'];

    if (empty($shelf) || empty($box_code)) {
        $dbLocSql = "SELECT r.name as shelf, lv.level_no, bx.box_code, bx.id as box_id, p.slot_id, sl.slot_no
                        FROM products p
                        JOIN slots sl ON p.slot_id = sl.id
                        JOIN boxes bx ON sl.box_id = bx.id
                        JOIN levels lv ON bx.level_id = lv.id
                        JOIN racks r ON lv.rack_id = r.id
                        WHERE p.name = ?
                        ORDER BY p.qty DESC LIMIT 1";
        $dbStmt = $condb->prepare($dbLocSql);
        $dbStmt->bind_param('s', $found['HanaPart']);
        $dbStmt->execute();
        $dbRes = $dbStmt->get_result()->fetch_assoc();
        $dbStmt->close();

        if ($dbRes) {
            $found['Loc_Shelf'] = $dbRes['shelf'];
            $found['Loc_Level'] = $dbRes['level_no'];
            $found['Loc_Box'] = $dbRes['box_code'];
            $found['box_id'] = $dbRes['box_id'];
            $found['slot_id'] = $dbRes['slot_id'];
            $found['Loc_Slot'] = $dbRes['slot_no'];

            $shelf = $found['Loc_Shelf'];
            $level_no = $found['Loc_Level'];
            $box_code = $found['Loc_Box'];
        }
    }

    if (!empty($shelf) && !empty($box_code) && !isset($found['box_id'])) {
        $locSql = "SELECT bx.id as box_id
                    FROM boxes bx
                    JOIN levels lv ON bx.level_id = lv.id
                    JOIN racks r ON lv.rack_id = r.id
                    WHERE r.name = ? AND lv.level_no = ? AND bx.box_code = ?
                    LIMIT 1";
        $lstmt = $condb->prepare($locSql);
        $lstmt->bind_param('sis', $shelf, $level_no, $box_code);
        $lstmt->execute();
        $lres = $lstmt->get_result()->fetch_assoc();
        $lstmt->close();

        if ($lres) {
            $found['box_id'] = $lres['box_id'];
            if (!isset($found['slot_id'])) {
                $blkSql = 'SELECT id, slot_no FROM slots WHERE box_id = ? ORDER BY id ASC LIMIT 1';
                $bstmt = $condb->prepare($blkSql);
                $bstmt->bind_param('i', $found['box_id']);
                $bstmt->execute();
                $bres = $bstmt->get_result()->fetch_assoc();
                $bstmt->close();
                if ($bres) {
                    $found['slot_id'] = $bres['id'];
                    $found['Loc_Slot'] = $bres['slot_no'];
                }
            }
        }
    }

    if (empty($found['Loc_Shelf']) || empty($found['Loc_Box'])) {
        return [
            'status' => 'error',
            'message' => "❌ ไม่พบตำแหน่งจัดเก็บสำหรับพาร์ท <b>“{$found['HanaPart']}”</b> ในระบบ (พาร์ทนี้ยังไม่ได้ลงทะเบียนตำแหน่งจัดเก็บ)",
        ];
    }

    if ($apiOnly) {
        $found['QtyRemain_source'] = 'pdservice';
        $found['data_source'] = 'pdservice';
    } else {
        inventory_enrich_qty_remain_sources($condb, $puid, $found);
    }

    return ['status' => 'success', 'data' => $found];
}

/**
 * PDService may return Correction in QtyRemain (negative). Never use that as remain.
 *
 * @return array{raw: ?int, usable: int}
 */
function inventory_parse_pdservice_qty_fields(array $apiData): array
{
    $raw = null;
    if (isset($apiData['QtyRemain']) && $apiData['QtyRemain'] !== '' && is_numeric($apiData['QtyRemain'])) {
        $raw = (int) round((float) $apiData['QtyRemain']);
    }

    $usable = 0;
    if ($raw !== null && $raw > 0) {
        $usable = $raw;
    }

    return ['raw' => $raw, 'usable' => $usable];
}

/**
 * Latest QtyRemain from local inventory_receive for a PUID.
 */
function inventory_receive_qty_remain(mysqli $condb, string $puid): ?int
{
    $puid = trim($puid);
    if ($puid === '') {
        return null;
    }

    $stmt = $condb->prepare(
        'SELECT QtyRemain FROM inventory_receive WHERE PUID = ? ORDER BY id DESC LIMIT 1'
    );
    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('s', $puid);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || !is_numeric($row['QtyRemain'])) {
        return null;
    }

    return (int) $row['QtyRemain'];
}

/**
 * CPK StationInvenCheck row for one PUID (if present at station).
 *
 * @return array{quantity: ?float, correction: ?float, original_qty: ?int, effective_remain: ?int}|null
 */
function inventory_cpk_station_row_breakdown(string $puid, string $partNumber = ''): ?array
{
    $puid = trim($puid);
    if ($puid === '') {
        return null;
    }

    if (!function_exists('cpk_mcid')) {
        require_once __DIR__ . '/cpk_service.php';
    }

    if (cpk_mcid() === null) {
        return null;
    }

    if (!function_exists('station_inven_fetch_from_cpk')) {
        require_once __DIR__ . '/station_inven_sync_service.php';
    }

    $fetch = station_inven_fetch_from_cpk(0, trim($partNumber));
    if (($fetch['status'] ?? '') !== 'success' || empty($fetch['items'])) {
        return null;
    }

    foreach ($fetch['items'] as $row) {
        if (!is_array($row)) {
            continue;
        }
        if (strcasecmp(trim((string) ($row['PUID'] ?? '')), $puid) !== 0) {
            continue;
        }

        $quantity = null;
        foreach (['Quantity', 'QtyRemain', 'Correction'] as $key) {
            if (isset($row[$key]) && is_numeric($row[$key])) {
                $quantity = (float) $row[$key];
                break;
            }
        }

        $original = null;
        foreach (['OriginalQty', 'Qty', 'OriginalQuantity'] as $key) {
            if (isset($row[$key]) && is_numeric($row[$key])) {
                $original = (int) round((float) $row[$key]);
                break;
            }
        }

        $correction = null;
        if (isset($row['Correction']) && is_numeric($row['Correction'])) {
            $correction = (float) $row['Correction'];
        } elseif ($quantity !== null && $quantity < 0) {
            $correction = $quantity;
        }

        $effective = cpk_station_row_effective_remain($row);

        return [
            'quantity' => $quantity,
            'correction' => $correction,
            'original_qty' => $original,
            'effective_remain' => $effective,
        ];
    }

    return null;
}

/**
 * CPK station inventory effective remain for one PUID (StationInvenCheck).
 */
function inventory_cpk_station_qty_remain(string $puid, string $partNumber = ''): ?int
{
    $breakdown = inventory_cpk_station_row_breakdown($puid, $partNumber);

    if ($breakdown === null) {
        return null;
    }

    $effective = $breakdown['effective_remain'];

    return ($effective !== null && $effective > 0) ? $effective : null;
}

/**
 * Qty Remain for UI: local warehouse first, then CPK station, then PDService (positive only).
 *
 * @param array<string, mixed> $found
 */
function inventory_enrich_qty_remain_sources(mysqli $condb, string $puid, array &$found, ?bool $includeCpkStation = null): void
{
    if ($includeCpkStation === null) {
        $includeCpkStation = inventory_fetch_cpk_station_enrich();
    }

    $pdserviceRaw = isset($found['QtyRemain_pdservice_raw'])
        ? $found['QtyRemain_pdservice_raw']
        : null;
    $pdserviceUsable = (int) ($found['QtyRemain'] ?? 0);
    if ($pdserviceUsable <= 0) {
        $pdserviceUsable = 0;
    }
    $found['QtyRemain_pdservice'] = $pdserviceRaw;

    $localQty = inventory_receive_qty_remain($condb, $puid);
    $cpkBreakdown = null;
    $cpkQty = null;
    if ($includeCpkStation) {
        $cpkBreakdown = inventory_cpk_station_row_breakdown($puid, (string) ($found['HanaPart'] ?? ''));
        $cpkQty = $cpkBreakdown['effective_remain'] ?? null;
    }
    if ($cpkQty !== null && $cpkQty <= 0) {
        $cpkQty = null;
    }

    if ($cpkBreakdown !== null) {
        $found['QtyRemain_cpk_quantity'] = $cpkBreakdown['quantity'];
        $found['QtyRemain_cpk_correction'] = $cpkBreakdown['correction'];
        $found['QtyRemain_cpk_effective'] = $cpkBreakdown['effective_remain'];
        $found['QtyRemain_cpk_original'] = $cpkBreakdown['original_qty'];
    }

    if ($localQty !== null && $localQty > 0) {
        $found['QtyRemain'] = $localQty;
        $found['QtyRemain_source'] = 'local';
    } elseif ($cpkQty !== null && $cpkQty > 0) {
        $found['QtyRemain'] = $cpkQty;
        $found['QtyRemain_source'] = 'cpk';
    } elseif ($pdserviceUsable > 0) {
        $found['QtyRemain'] = $pdserviceUsable;
        $found['QtyRemain_source'] = 'pdservice';
    } else {
        $found['QtyRemain'] = 0;
        $found['QtyRemain_source'] = 'none';
    }

    $displayQty = (int) ($found['QtyRemain'] ?? 0);
    if ($displayQty > 0 && $cpkQty !== null && $cpkQty !== $displayQty) {
        $found['cpk_sync_recommended'] = true;
    } elseif (
        $displayQty > 0
        && $cpkBreakdown !== null
        && $cpkBreakdown['correction'] !== null
        && (float) $cpkBreakdown['correction'] < 0
        && ($cpkQty === null || $cpkQty !== $displayQty)
    ) {
        $found['cpk_sync_recommended'] = true;
    } else {
        $found['cpk_sync_recommended'] = false;
    }
}

/**
 * After CPK UpdatePUIDStatus: compare target qty with PDService + StationInvenCheck.
 *
 * @return array<string, mixed>
 */
function inventory_verify_central_qty_after_cpk(string $puid, int $targetQty, string $hanaPart = ''): array
{
    $puid = trim($puid);
    $targetQty = max(0, $targetQty);
    $isEN = function_exists('__') && __('logout') === 'Logout';

    $pdserviceRemain = null;
    $pds = pdservice_fetch_puid($puid);
    if ($pds !== null && isset($pds['QtyRemain']) && is_numeric($pds['QtyRemain'])) {
        $pdserviceRemain = (int) round((float) $pds['QtyRemain']);
    }

    if (!function_exists('station_inven_clear_session_cache')) {
        require_once __DIR__ . '/station_inven_sync_service.php';
    }
    station_inven_clear_session_cache();

    $station = inventory_cpk_station_row_breakdown($puid, trim($hanaPart));
    $stationQty = $station['quantity'] ?? null;
    $stationEffective = $station['effective_remain'] ?? null;

    $pdserviceAligned = $pdserviceRemain !== null && $pdserviceRemain === $targetQty;
    $stationAligned = $stationEffective !== null && $stationEffective === $targetQty;

    $note = '';
    if (!$pdserviceAligned || !$stationAligned) {
        $note = $isEN
            ? 'CPK accepted New_Qty, but the central report field QtyRemain (PDService / station Quantity) may still show a negative Correction until IT/CPK syncs that column. Actual remain at CPK is NewQty from UpdatePUIDStatus.'
            : 'CPK รับ New_Qty แล้ว แต่คอลัมน์ QtyRemain ในรายงานกลาง (PDService / Station Quantity) อาจยังเป็นค่าติดลบ (Correction) จนกว่าทีม CPK/IT จะ sync — คงเหลือจริงดูที่ NewQty จาก UpdatePUIDStatus';
    }

    return [
        'target_qty' => $targetQty,
        'pdservice_qty_remain' => $pdserviceRemain,
        'pdservice_aligned' => $pdserviceAligned,
        'station_quantity' => $stationQty,
        'station_effective_remain' => $stationEffective,
        'station_aligned' => $stationAligned,
        'central_report_aligned' => $pdserviceAligned && $stationAligned,
        'message' => $note,
    ];
}

/**
 * When PDService is down: use CPK StationInvenCheck row + warehouse slot by part number.
 *
 * @return array{status: string, message?: string, data?: array}
 */
function inventory_fetch_cpk_station_fallback(mysqli $condb, string $puid, string $hana = ''): array
{
    $puid = inventory_normalize_puid($puid);
    $hana = trim($hana);
    $isEN = function_exists('__') && __('logout') === 'Logout';

    $row = inventory_cpk_station_row_for_puid($puid, $hana);
    if ($row === null) {
        return [
            'status' => 'error',
            'message' => $isEN
                ? 'PUID not found in CPK station inventory.'
                : 'ไม่พบ PUID ในสต็อกสถานี CPK',
        ];
    }

    $partName = trim((string) ($row['PartNumber'] ?? ''));
    if ($partName === '') {
        return [
            'status' => 'error',
            'message' => $isEN
                ? 'CPK row has no part number.'
                : 'ข้อมูล CPK ไม่มีรหัสพาร์ท',
        ];
    }

    if ($hana !== '' && strcasecmp($partName, $hana) !== 0) {
        return [
            'status' => 'error',
            'message' => "ข้อมูล PUID นี้เป็นของพาร์ท <b>{$partName}</b> (ไม่ตรงกับ <b>$hana</b>)",
        ];
    }

    if (!function_exists('station_inven_expire_to_sql')) {
        require_once __DIR__ . '/station_inven_sync_service.php';
    }
    if (!function_exists('cpk_station_row_effective_remain')) {
        require_once __DIR__ . '/cpk_service.php';
    }

    $effective = cpk_station_row_effective_remain($row);
    $originalQty = (int) ($row['OriginalQty'] ?? $row['Qty'] ?? 0);
    if ($originalQty <= 0 && $effective !== null && $effective > 0) {
        $originalQty = $effective;
    }
    $qtyRemain = ($effective !== null && $effective > 0) ? $effective : 0;
    $expiration = station_inven_expire_to_sql($row['ExpireDate'] ?? null);

    $found = [
        'ReceiveDate' => date('Y-m-d H:i:s'),
        'PUID' => $puid,
        'IM' => trim((string) ($row['BatchNumber'] ?? '')),
        'Customer' => '',
        'HanaPart' => $partName,
        'Description' => '',
        'MnfPartNo' => '',
        'LotNo' => trim((string) ($row['BatchNumber'] ?? '')),
        'DateCode' => '',
        'BinSize' => '',
        'Qty' => $originalQty > 0 ? $originalQty : $qtyRemain,
        'QtyRemain' => $qtyRemain,
        'QtyRemain_source' => 'cpk',
        'McID' => (string) (cpk_mcid() ?? ''),
        'MachineName' => '',
        'StatusName' => 'Available',
        'ExpirationDate' => $expiration ?? '',
        'OldIM' => '',
        'Remark' => trim((string) ($row['LocationInfo'] ?? '')),
        'Loc_Shelf' => '',
        'Loc_Level' => '',
        'Loc_Box' => '',
        'ExpireDate_RoomTemp' => '',
    ];

    return inventory_resolve_found_storage_location($condb, $found, $isEN);
}

/**
 * Resolve rack/level/box/slot for a part and validate slot_id exists.
 *
 * @param array<string, mixed> $found
 * @return array{status: string, message?: string, data?: array}
 */
function inventory_resolve_found_storage_location(mysqli $condb, array $found, ?bool $isEN = null): array
{
    if ($isEN === null) {
        $isEN = function_exists('__') && __('logout') === 'Logout';
    }

    $partName = trim((string) ($found['HanaPart'] ?? ''));
    $shelf = $found['Loc_Shelf'] ?? '';
    $level_no = (int) ($found['Loc_Level'] ?? 0);
    $box_code = $found['Loc_Box'] ?? '';

    if (empty($shelf) || empty($box_code)) {
        $dbLocSql = 'SELECT r.name as shelf, lv.level_no, bx.box_code, bx.id as box_id, p.slot_id, sl.slot_no
                        FROM products p
                        JOIN slots sl ON p.slot_id = sl.id
                        JOIN boxes bx ON sl.box_id = bx.id
                        JOIN levels lv ON bx.level_id = lv.id
                        JOIN racks r ON lv.rack_id = r.id
                        WHERE p.name = ?
                        ORDER BY p.qty DESC LIMIT 1';
        $dbStmt = $condb->prepare($dbLocSql);
        $dbStmt->bind_param('s', $partName);
        $dbStmt->execute();
        $dbRes = $dbStmt->get_result()->fetch_assoc();
        $dbStmt->close();

        if ($dbRes) {
            $found['Loc_Shelf'] = $dbRes['shelf'];
            $found['Loc_Level'] = $dbRes['level_no'];
            $found['Loc_Box'] = $dbRes['box_code'];
            $found['box_id'] = (int) $dbRes['box_id'];
            $found['slot_id'] = (int) $dbRes['slot_id'];
            $found['Loc_Slot'] = $dbRes['slot_no'];
            $shelf = $found['Loc_Shelf'];
            $level_no = (int) $found['Loc_Level'];
            $box_code = $found['Loc_Box'];
        }
    }

    if (!empty($shelf) && !empty($box_code) && empty($found['box_id'])) {
        $locSql = 'SELECT bx.id as box_id
                    FROM boxes bx
                    JOIN levels lv ON bx.level_id = lv.id
                    JOIN racks r ON lv.rack_id = r.id
                    WHERE r.name = ? AND lv.level_no = ? AND bx.box_code = ?
                    LIMIT 1';
        $lstmt = $condb->prepare($locSql);
        $lstmt->bind_param('sis', $shelf, $level_no, $box_code);
        $lstmt->execute();
        $lres = $lstmt->get_result()->fetch_assoc();
        $lstmt->close();

        if ($lres) {
            $found['box_id'] = (int) $lres['box_id'];
            if (empty($found['slot_id'])) {
                $blkSql = 'SELECT id, slot_no FROM slots WHERE box_id = ? ORDER BY id ASC LIMIT 1';
                $bstmt = $condb->prepare($blkSql);
                $bstmt->bind_param('i', $found['box_id']);
                $bstmt->execute();
                $bres = $bstmt->get_result()->fetch_assoc();
                $bstmt->close();
                if ($bres) {
                    $found['slot_id'] = (int) $bres['id'];
                    $found['Loc_Slot'] = $bres['slot_no'];
                }
            }
        }
    }

    if (empty($found['slot_id'])) {
        return [
            'status' => 'error',
            'message' => $isEN
                ? 'No storage location registered for this part in local warehouse'
                : 'ไม่พบตำแหน่งจัดเก็บสำหรับพาร์ทนี้ในระบบคลัง',
        ];
    }

    return ['status' => 'success', 'data' => $found];
}

/**
 * When PDService is down: use inventory_receive row and/or warehouse slot by part number.
 *
 * @return array{status: string, message?: string, data?: array}
 */
function inventory_fetch_local_fallback(mysqli $condb, string $puid, string $hana = ''): array
{
    $puid = inventory_normalize_puid($puid);
    $hana = trim($hana);

    $row = null;
    if ($puid !== '') {
        $stmt = $condb->prepare(
            "SELECT * FROM inventory_receive
             WHERE PUID = ? AND StatusName NOT IN ('Withdrawn', 'Empty')
             ORDER BY id DESC LIMIT 1"
        );
        $stmt->bind_param('s', $puid);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }

    $partName = $hana;
    if ($row) {
        $partName = trim((string) ($row['HanaPart'] ?? '')) ?: $partName;
    }

    if ($partName === '') {
        return ['status' => 'error', 'message' => 'No local record and part number unknown'];
    }

    $found = [
        'ReceiveDate' => $row['ReceiveDate'] ?? date('Y-m-d H:i:s'),
        'PUID' => $puid,
        'IM' => $row['IM'] ?? '',
        'Customer' => $row['Customer'] ?? '',
        'HanaPart' => $partName,
        'Description' => $row['Description'] ?? '',
        'MnfPartNo' => $row['MnfPartNo'] ?? '',
        'LotNo' => $row['LotNo'] ?? '',
        'DateCode' => $row['DateCode'] ?? '',
        'BinSize' => $row['BinSize'] ?? '',
        'Qty' => (int) ($row['Qty'] ?? 0),
        'QtyRemain' => (int) ($row['QtyRemain'] ?? $row['Qty'] ?? 0),
        'McID' => $row['McID'] ?? '',
        'MachineName' => $row['MachineName'] ?? '',
        'StatusName' => $row['StatusName'] ?? 'Available',
        'ExpirationDate' => $row['ExpirationDate'] ?? '',
        'OldIM' => $row['OldIM'] ?? '',
        'Remark' => $row['Remark'] ?? '',
        'Loc_Shelf' => $row['Loc_Shelf'] ?? '',
        'Loc_Level' => $row['Loc_Level'] ?? '',
        'Loc_Box' => $row['Loc_Box'] ?? '',
        'ExpireDate_RoomTemp' => $row['ExpireDate_RoomTemp'] ?? '',
    ];

    $resolved = inventory_resolve_found_storage_location($condb, $found);
    if (($resolved['status'] ?? '') !== 'success' || !isset($resolved['data'])) {
        return $resolved;
    }

    $found = $resolved['data'];
    inventory_enrich_qty_remain_sources($condb, $puid, $found);

    return ['status' => 'success', 'data' => $found];
}

/** Days ahead included in central sync (expired + expiring soon). */
function expiration_sync_near_days(): int
{
    return 7;
}

/**
 * True when date is expired or on/before today + near-days (sync scope only).
 */
function expiration_date_in_sync_scope(?string $dateSql): bool
{
    $dateSql = trim((string) ($dateSql ?? ''));
    if ($dateSql === '') {
        return false;
    }

    if (strlen($dateSql) > 10) {
        $dateSql = substr($dateSql, 0, 10);
    }

    $cutoff = date('Y-m-d', strtotime('+' . expiration_sync_near_days() . ' days'));

    return $dateSql <= $cutoff;
}

/** SQL condition: expired or expiring within near-days (for central sync / PDService batch). */
function expiration_sync_date_sql(): string
{
    $d = expiration_sync_near_days();

    return "ExpirationDate <= DATE_ADD(CURDATE(), INTERVAL {$d} DAY)";
}

/**
 * WHERE parts for central sync — always expired + within 7 days (not full stock).
 *
 * @return array{conditions:list<string>,params:list<string>,types:string}
 */
function expiration_central_sync_where_parts(string $search, string $resNo = ''): array
{
    $conditions = ['QtyRemain > 0', expiration_sync_date_sql()];
    $params = [];
    $types = '';

    $resNo = trim($resNo);
    if ($resNo !== '') {
        $conditions[] = 'ReservationNo = ?';
        $params[] = $resNo;
        $types .= 's';
    }

    $search = trim($search);
    if ($search !== '') {
        $term = '%' . $search . '%';
        $conditions[] = '(HanaPart LIKE ? OR IM LIKE ? OR PUID LIKE ?)';
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $types .= 'sss';
    }

    return [
        'conditions' => $conditions,
        'params' => $params,
        'types' => $types,
    ];
}

/**
 * Build WHERE fragments for expiration list (matches check_expiration.php filters).
 *
 * @return array{conditions:list<string>,params:list<string>,types:string}
 */
function expiration_filter_where_parts(string $search, string $statusFilter, string $resNo = ''): array
{
    $conditions = ['QtyRemain > 0'];
    $params = [];
    $types = '';

    $resNo = trim($resNo);
    if ($resNo !== '') {
        $conditions[] = 'ReservationNo = ?';
        $params[] = $resNo;
        $types .= 's';
    }

    $search = trim($search);
    if ($search !== '') {
        $term = '%' . $search . '%';
        $conditions[] = '(HanaPart LIKE ? OR IM LIKE ? OR PUID LIKE ?)';
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $types .= 'sss';
    }

    switch ($statusFilter) {
        case 'expired':
            $conditions[] = 'ExpirationDate < CURDATE()';
            break;
        case 'soon':
            $conditions[] = 'ExpirationDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)';
            break;
        case 'normal':
            $conditions[] = 'ExpirationDate > DATE_ADD(CURDATE(), INTERVAL 7 DAY)';
            break;
        case 'all_stock':
            break;
        default:
            $conditions[] = 'ExpirationDate <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)';
            break;
    }

    return [
        'conditions' => $conditions,
        'params' => $params,
        'types' => $types,
    ];
}

/**
 * Apply PDService PUID payload to inventory_receive row.
 */
function inventory_apply_pdservice_data(mysqli $condb, int $id, array $apiData): bool
{
    $newDate = nullable_sql_datetime($apiData['ExpirationDate'] ?? null);
    $IM = $apiData['IM'] ?? '';
    $Customer = $apiData['Customer'] ?? '';
    $HanaPart = $apiData['HanaPart'] ?? '';
    $Description = $apiData['Description'] ?? '';
    $MnfPartNo = $apiData['MnfPartNo'] ?? '';
    $LotNo = $apiData['LotNo'] ?? '';
    $DateCode = $apiData['DateCode'] ?? '';
    $BinSize = $apiData['BinSize'] ?? '';
    $McID = !empty($apiData['McID']) ? (int) $apiData['McID'] : null;
    $MachineName = $apiData['MachineName'] ?? '';
    $StatusName = $apiData['StatusName'] ?? '';
    $OldIM = $apiData['OldIM'] ?? '';
    $Remark = $apiData['Remark'] ?? '';
    $ExpireDate_RoomTemp = nullable_sql_datetime($apiData['ExpireDate_RoomTemp'] ?? null);

    $updateSql = 'UPDATE inventory_receive SET
        ExpirationDate = COALESCE(?, ExpirationDate),
        IM = ?,
        Customer = ?,
        HanaPart = ?,
        Description = ?,
        MnfPartNo = ?,
        LotNo = ?,
        DateCode = ?,
        BinSize = ?,
        McID = ?,
        MachineName = ?,
        StatusName = ?,
        OldIM = ?,
        Remark = ?,
        ExpireDate_RoomTemp = COALESCE(?, ExpireDate_RoomTemp),
        updated_at = NOW()
    WHERE id = ?';

    $stmt = $condb->prepare($updateSql);
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param(
        'sssssssssisssssi',
        $newDate,
        $IM,
        $Customer,
        $HanaPart,
        $Description,
        $MnfPartNo,
        $LotNo,
        $DateCode,
        $BinSize,
        $McID,
        $MachineName,
        $StatusName,
        $OldIM,
        $Remark,
        $ExpireDate_RoomTemp,
        $id
    );

    $ok = $stmt->execute();
    $stmt->close();

    return $ok;
}

/**
 * Refresh expiration dates from PDService for local in-stock PUIDs matching filters.
 * Used when CPK StationInvenCheck no longer returns items after expiration extension.
 *
 * @return array{status:string,message:string,checked:int,updated:int,errors:int}
 */
function inventory_sync_expiration_from_pdservice(
    mysqli $condb,
    string $search = '',
    string $statusFilter = 'all',
    int $limit = 50,
    string $resNo = '',
    bool $onlyMissingExpiration = false
): array {
    unset($statusFilter);
    $limit = max(1, min($limit, 200));
    $where = expiration_central_sync_where_parts($search, $resNo);
    if ($onlyMissingExpiration) {
        $where['conditions'][] = "(ExpirationDate IS NULL OR ExpirationDate = '' OR ExpirationDate = '0000-00-00')";
    }
    $whereSql = 'WHERE ' . implode(' AND ', $where['conditions']);

    $sql = "SELECT id, PUID FROM inventory_receive $whereSql
            ORDER BY updated_at ASC, ExpirationDate ASC
            LIMIT $limit";

    $stmt = $condb->prepare($sql);
    if (!$stmt) {
        return [
            'status' => 'error',
            'message' => 'Database prepare failed: ' . $condb->error,
            'checked' => 0,
            'updated' => 0,
            'errors' => 0,
        ];
    }

    if ($where['types'] !== '') {
        $stmt->bind_param($where['types'], ...$where['params']);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    if ($rows === []) {
        return [
            'status' => 'skipped',
            'message' => $onlyMissingExpiration
                ? 'PDService: no PUID missing expiration in scope'
                : 'PDService: no PUID in scope',
            'checked' => 0,
            'updated' => 0,
            'errors' => 0,
            'skipped' => true,
        ];
    }

    $checked = 0;
    $updated = 0;
    $errors = 0;

    foreach ($rows as $row) {
        $checked++;
        $id = (int) $row['id'];
        $puid = trim((string) ($row['PUID'] ?? ''));
        if ($puid === '') {
            $errors++;
            continue;
        }

        $fetch = inventory_fetch_by_puid($condb, $puid, '', ['api_only' => true]);
        if ($fetch['status'] !== 'success' || empty($fetch['data'])) {
            $errors++;
            continue;
        }

        if (inventory_apply_pdservice_data($condb, $id, $fetch['data'])) {
            $updated++;
        } else {
            $errors++;
        }
    }

    return [
        'status' => 'success',
        'message' => "PDService: checked $checked, updated $updated" . ($errors > 0 ? ", errors $errors" : ''),
        'checked' => $checked,
        'updated' => $updated,
        'errors' => $errors,
    ];
}

/**
 * Preview PUID for BookingOut — PDService + local receive + CPK station (no warehouse location required).
 *
 * @return array{status: string, message?: string, data?: array<string, mixed>}
 */
function booking_out_puid_preview(mysqli $condb, string $puid): array
{
    require_once __DIR__ . '/cpk_service.php';

    $puid = cpk_normalize_puid_input($puid);
    $isEN = function_exists('__') && __('logout') === 'Logout';

    $puidError = cpk_validate_real_puid($puid);
    if ($puidError !== null) {
        return ['status' => 'error', 'message' => $puidError];
    }

    $found = ['PUID' => $puid];
    $sources = [];

    $pds = pdservice_fetch_puid($puid);
    if (is_array($pds) && $pds !== []) {
        $pdsQty = inventory_parse_pdservice_qty_fields($pds);
        $found = array_merge($found, [
            'HanaPart' => $pds['HanaPart'] ?? '',
            'Description' => $pds['Description'] ?? '',
            'IM' => $pds['IM'] ?? '',
            'LotNo' => $pds['LotNo'] ?? '',
            'Qty' => (int) ($pds['Qty'] ?? 0),
            'QtyRemain' => $pdsQty['effective'] ?? $pdsQty['usable'],
            'QtyRemain_pdservice_raw' => $pdsQty['raw'],
            'McID' => $pds['McID'] ?? '',
            'MachineName' => $pds['MachineName'] ?? '',
            'StatusName' => $pds['StatusName'] ?? '',
            'ExpirationDate' => $pds['ExpirationDate'] ?? '',
            'Customer' => $pds['Customer'] ?? '',
            'DateCode' => $pds['DateCode'] ?? '',
        ]);
        $sources[] = 'pdservice';
    }

    $stmt = $condb->prepare(
        "SELECT HanaPart, Description, IM, LotNo, Qty, QtyRemain, McID, MachineName,
                StatusName, ExpirationDate, Customer, DateCode, Loc_Shelf, Loc_Level, Loc_Box
         FROM inventory_receive
         WHERE PUID = ? AND StatusName NOT IN ('Withdrawn', 'Empty')
         ORDER BY id DESC LIMIT 1"
    );
    $stmt->bind_param('s', $puid);
    $stmt->execute();
    $local = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($local) {
        foreach ($local as $key => $value) {
            if ($value !== null && $value !== '' && empty($found[$key])) {
                $found[$key] = $value;
            }
        }
        if (!empty($local['QtyRemain']) && (int) $local['QtyRemain'] > 0) {
            $found['QtyRemain'] = (int) $local['QtyRemain'];
        }
        if (!in_array('local', $sources, true)) {
            $sources[] = 'local';
        }
    }

    $hanaPart = trim((string) ($found['HanaPart'] ?? ''));
    $cpkBreakdown = inventory_cpk_station_row_breakdown($puid, $hanaPart);
    if ($cpkBreakdown !== null) {
        $found['cpk_quantity'] = $cpkBreakdown['quantity'];
        $found['cpk_correction'] = $cpkBreakdown['correction'];
        $found['cpk_effective_remain'] = $cpkBreakdown['effective_remain'];
        $found['cpk_original_qty'] = $cpkBreakdown['original_qty'];
        if (
            empty($found['QtyRemain'])
            && $cpkBreakdown['effective_remain'] !== null
            && $cpkBreakdown['effective_remain'] > 0
        ) {
            $found['QtyRemain'] = $cpkBreakdown['effective_remain'];
        }
        $sources[] = 'cpk_station';
    }

    if ($hanaPart === '' && empty($found['IM']) && empty($local)) {
        return [
            'status' => 'error',
            'message' => $isEN
                ? 'PUID not found in PDService, local warehouse, or CPK station inventory.'
                : 'ไม่พบ PUID ใน PDService, คลังในระบบ หรือสต็อกสถานี CPK',
        ];
    }

    $locParts = array_filter([
        $found['Loc_Shelf'] ?? '',
        isset($found['Loc_Level']) && $found['Loc_Level'] !== '' ? 'L' . $found['Loc_Level'] : '',
        !empty($found['Loc_Box']) ? 'Box ' . $found['Loc_Box'] : '',
    ]);
    $found['Location'] = $locParts !== [] ? implode(' ', $locParts) : '';

    $found['preview_sources'] = $sources;
    $found['booking_eligibility'] = [
        'STORE' => cpk_booking_out_eligibility($found, 'STORE'),
        'OTHER' => cpk_booking_out_eligibility($found, 'OTHER'),
    ];

    return ['status' => 'success', 'data' => $found];
}

/**
 * Write stock_logs row after successful CPK BookingOutPUID (STORE / OTHER).
 */
function inventory_log_booking_out(
    mysqli $condb,
    string $puid,
    string $destination,
    int $userId,
    ?array $puidInfo = null,
    string $operator = ''
): bool {
    require_once __DIR__ . '/cpk_service.php';

    $puid = cpk_normalize_puid_input($puid);
    $dest = cpk_normalize_booking_destination($destination) ?? 'STORE';
    if ($puid === '' || $userId <= 0) {
        return false;
    }

    $hanaPart = trim((string) ($puidInfo['PartNumber'] ?? ''));
    $qty = (int) ($puidInfo['Quantity'] ?? 0);

    $stmt = $condb->prepare(
        "SELECT HanaPart, Qty, QtyRemain FROM inventory_receive
         WHERE PUID = ? AND StatusName NOT IN ('Withdrawn', 'Empty')
         ORDER BY id DESC LIMIT 1"
    );
    $stmt->bind_param('s', $puid);
    $stmt->execute();
    $local = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($local) {
        if ($hanaPart === '') {
            $hanaPart = trim((string) ($local['HanaPart'] ?? ''));
        }
        if ($qty <= 0) {
            $qty = (int) ($local['QtyRemain'] ?? $local['Qty'] ?? 0);
        }
    }

    if ($hanaPart === '') {
        return false;
    }

    $prodStmt = $condb->prepare('SELECT id FROM products WHERE name = ? ORDER BY id DESC LIMIT 1');
    $prodStmt->bind_param('s', $hanaPart);
    $prodStmt->execute();
    $prod = $prodStmt->get_result()->fetch_assoc();
    $prodStmt->close();

    if (!$prod) {
        return false;
    }

    $safePuid = str_replace('|', '-', $puid);
    $logAction = 'booking_out_' . $dest . '|' . max(0, $qty) . '|' . $safePuid;
    $remark = '[BookingOut → ' . $dest . ']';
    if ($operator !== '') {
        $remark .= ' Operator: ' . str_replace('|', '-', $operator);
    }

    $logNow = date('Y-m-d H:i:s');
    $logQty = 1;
    $productId = (int) $prod['id'];

    $logSql = 'INSERT INTO stock_logs (product_id, user_id, action, quantity, created_at, remark)
               VALUES (?, ?, ?, ?, ?, ?)';
    $logStmt = $condb->prepare($logSql);
    $logStmt->bind_param('iisiss', $productId, $userId, $logAction, $logQty, $logNow, $remark);

    return $logStmt->execute();
}

/**
 * Mark PUID as withdrawn in local warehouse (inventory_receive + products.qty).
 *
 * @return array{ok:bool,message:string,hana_part:string,qty:int,product_id:int}
 */
function inventory_withdraw_puid_local(mysqli $condb, string $puid): array
{
    require_once __DIR__ . '/cpk_service.php';

    $puid = cpk_normalize_puid_input($puid);
    $fail = static function (string $message): array {
        return [
            'ok' => false,
            'message' => $message,
            'hana_part' => '',
            'qty' => 0,
            'product_id' => 0,
        ];
    };

    if ($puid === '') {
        return $fail('PUID is required');
    }

    $stmt = $condb->prepare(
        "SELECT id, QtyRemain, HanaPart FROM inventory_receive
         WHERE PUID = ? AND QtyRemain > 0 AND StatusName NOT IN ('Withdrawn', 'Empty')
         ORDER BY id DESC LIMIT 1"
    );
    if (!$stmt) {
        return $fail('Database error');
    }

    $stmt->bind_param('s', $puid);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        return $fail('PUID not found in local stock or already withdrawn');
    }

    $itemId = (int) $row['id'];
    $hanaPart = trim((string) ($row['HanaPart'] ?? ''));
    $withdrawQty = (int) ($row['QtyRemain'] ?? 0);

    if ($hanaPart === '') {
        return $fail('HanaPart missing for PUID');
    }

    $condb->begin_transaction();

    try {
        $upd = $condb->prepare("UPDATE inventory_receive SET QtyRemain = 0, StatusName = 'Withdrawn' WHERE id = ?");
        if (!$upd) {
            throw new RuntimeException('Database error');
        }
        $upd->bind_param('i', $itemId);
        $upd->execute();
        $upd->close();

        $productId = 0;
        $prodStmt = $condb->prepare('SELECT id, qty FROM products WHERE name = ? ORDER BY id DESC LIMIT 1');
        if ($prodStmt) {
            $prodStmt->bind_param('s', $hanaPart);
            $prodStmt->execute();
            $prod = $prodStmt->get_result()->fetch_assoc();
            $prodStmt->close();

            if ($prod) {
                $productId = (int) $prod['id'];
                $newProdQty = max(0, (int) ($prod['qty'] ?? 0) - 1);
                $updProd = $condb->prepare('UPDATE products SET qty = ? WHERE id = ?');
                if ($updProd) {
                    $updProd->bind_param('ii', $newProdQty, $productId);
                    $updProd->execute();
                    $updProd->close();
                }
            }
        }

        $condb->commit();

        return [
            'ok' => true,
            'message' => 'Local stock updated',
            'hana_part' => $hanaPart,
            'qty' => $withdrawQty,
            'product_id' => $productId,
        ];
    } catch (Throwable $e) {
        $condb->rollback();

        return $fail($e->getMessage());
    }
}

/**
 * Write stock_logs row after successful CPK IssuePUIDToPicklist.
 */
function inventory_log_picklist_issue(
    mysqli $condb,
    string $picklistId,
    string $puid,
    int $userId,
    ?array $puidInfo = null,
    string $operator = ''
): bool {
    require_once __DIR__ . '/cpk_service.php';

    $picklistId = trim($picklistId);
    $puid = cpk_normalize_puid_input($puid);
    if ($picklistId === '' || $puid === '' || $userId <= 0) {
        return false;
    }

    $hanaPart = trim((string) ($puidInfo['PartNumber'] ?? ''));
    $qty = (int) ($puidInfo['Quantity'] ?? 0);

    $stmt = $condb->prepare(
        "SELECT HanaPart, Qty, QtyRemain FROM inventory_receive
         WHERE PUID = ? AND StatusName NOT IN ('Withdrawn', 'Empty')
         ORDER BY id DESC LIMIT 1"
    );
    $stmt->bind_param('s', $puid);
    $stmt->execute();
    $local = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($local) {
        if ($hanaPart === '') {
            $hanaPart = trim((string) ($local['HanaPart'] ?? ''));
        }
        if ($qty <= 0) {
            $qty = (int) ($local['QtyRemain'] ?? $local['Qty'] ?? 0);
        }
    }

    if ($hanaPart === '') {
        return false;
    }

    $prodStmt = $condb->prepare('SELECT id FROM products WHERE name = ? ORDER BY id DESC LIMIT 1');
    $prodStmt->bind_param('s', $hanaPart);
    $prodStmt->execute();
    $prod = $prodStmt->get_result()->fetch_assoc();
    $prodStmt->close();

    if (!$prod) {
        return false;
    }

    $safePuid = str_replace('|', '-', $puid);
    $safePicklist = str_replace('|', '-', $picklistId);
    $logAction = 'picklist_issue|' . max(0, $qty) . '|' . $safePuid;
    $remark = '[Picklist: ' . $safePicklist . ']';
    if ($operator !== '') {
        $remark .= ' Operator: ' . str_replace('|', '-', $operator);
    }

    $logNow = date('Y-m-d H:i:s');
    $logQty = 1;
    $productId = (int) $prod['id'];

    $logSql = 'INSERT INTO stock_logs (product_id, user_id, action, quantity, created_at, remark)
               VALUES (?, ?, ?, ?, ?, ?)';
    $logStmt = $condb->prepare($logSql);
    $logStmt->bind_param('iisiss', $productId, $userId, $logAction, $logQty, $logNow, $remark);

    return $logStmt->execute();
}
