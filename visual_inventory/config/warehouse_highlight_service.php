<?php

require_once __DIR__ . '/io_device_service.php';

function wh_is_en(): bool
{
    return (($_SESSION['lang'] ?? 'th') === 'en');
}

/**
 * @param array<int, string> $args
 */
function wh_msg(?bool $isEN, string $key, array $args = []): string
{
    $isEN = $isEN ?? wh_is_en();
    $catalog = [
        'no_material' => [
            'No material in warehouse: %s',
            'ไม่มีวัตถุดิบในคลัง: %s',
        ],
        'no_material_at_position' => [
            'No material at storage position: %s',
            'ไม่มีวัตถุดิบในตำแหน่งจัดเก็บ: %s',
        ],
        'no_storage_loc' => [
            'In stock but position not set: %s',
            'มีวัตถุดิบแต่ยังไม่ระบุตำแหน่ง: %s',
        ],
        'no_layout_for_loc' => [
            'In stock at %s — position not in layout',
            'มีวัตถุดิบที่ %s แต่ไม่พบตำแหน่งใน layout',
        ],
        'no_puid' => [
            'PUID not found: %s',
            'ไม่พบ PUID: %s',
        ],
        'location_not_found' => [
            'Not in warehouse',
            'ไม่พบในคลัง',
        ],
        'location_not_found_part' => [
            'Not in warehouse: %s',
            'ไม่พบในคลัง: %s',
        ],
        'location_not_mapped' => [
            'No layout slot for %s',
            'ไม่พบตำแหน่ง layout: %s',
        ],
        'tv_write_failed' => [
            'Failed to show on TV/3D',
            'แสดงบน TV/3D ไม่สำเร็จ',
        ],
        'highlight_ok' => [
            'Shown on TV & 3D',
            'แสดงบน TV & 3D แล้ว',
        ],
        'post_only' => [
            'Only POST allowed',
            'รองรับเฉพาะ POST',
        ],
    ];

    $pair = $catalog[$key] ?? ['Error', 'เกิดข้อผิดพลาด'];
    $text = $isEN ? $pair[0] : $pair[1];
    foreach ($args as $value) {
        $text = preg_replace('/%s/', (string) $value, $text, 1) ?? $text;
    }

    return $text;
}

/**
 * @param array<string, mixed> $row
 */
function wh_format_loc_hint(array $row): string
{
    $parts = [];
    $rack = trim((string) ($row['rack_name'] ?? $row['Loc_Shelf'] ?? ''));
    $level = $row['level_no'] ?? $row['Loc_Level'] ?? '';
    $box = trim((string) ($row['box_code'] ?? $row['Loc_Box'] ?? ''));
    $slot = $row['slot_no'] ?? $row['Loc_Slot'] ?? '';

    if ($rack !== '') {
        $parts[] = 'Rack ' . $rack;
    }
    if ($level !== '' && $level !== null) {
        $parts[] = 'L' . $level;
    }
    if ($box !== '') {
        $parts[] = 'B' . $box;
    }
    if ($slot !== '' && $slot !== null) {
        $parts[] = 'S' . $slot;
    }

    return implode('/', $parts);
}

/**
 * @return array<string, mixed>|null
 */
function wh_fetch_first_active_inventory_by_part(mysqli $condb, string $part): ?array
{
    require_once __DIR__ . '/fifo_service.php';

    $part = fifo_normalize_part($part);
    if ($part === '') {
        return null;
    }

    $stmt = $condb->prepare("
        SELECT PUID, HanaPart, QtyRemain, Loc_Shelf, Loc_Level, Loc_Box
        FROM inventory_receive
        WHERE HanaPart = ?
          AND QtyRemain > 0
          AND StatusName NOT IN ('Withdrawn', 'Empty')
        ORDER BY ExpirationDate ASC, ReceiveDate ASC
        LIMIT 1
    ");
    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('s', $part);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function wh_fetch_first_active_inventory_by_puid(mysqli $condb, string $puid): ?array
{
    require_once __DIR__ . '/inventory_api_service.php';

    $candidates = inventory_puid_lookup_candidates($puid);
    if ($candidates === []) {
        return null;
    }

    $upper = array_map('strtoupper', $candidates);
    $placeholders = implode(',', array_fill(0, count($upper), '?'));
    $sql = "SELECT PUID, HanaPart, QtyRemain, Loc_Shelf, Loc_Level, Loc_Box
            FROM inventory_receive
            WHERE UPPER(PUID) IN ({$placeholders})
              AND QtyRemain > 0
              AND StatusName NOT IN ('Withdrawn', 'Empty')
            ORDER BY id DESC
            LIMIT 1";

    $stmt = $condb->prepare($sql);
    if (!$stmt) {
        return null;
    }

    $types = str_repeat('s', count($upper));
    $stmt->bind_param($types, ...$upper);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ?: null;
}

function wh_part_has_layout_slot(mysqli $condb, string $part): bool
{
    $part = trim($part);
    if ($part === '') {
        return false;
    }

    $stmt = $condb->prepare('SELECT id FROM products WHERE name = ? LIMIT 1');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('s', $part);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return (bool) $row;
}

/**
 * Build a clear TH/EN message: no stock vs no position vs not mapped in layout.
 *
 * @param array<string, mixed> $input
 */
function wh_highlight_failure_message(mysqli $condb, array $input, ?bool $isEN = null): string
{
    $isEN = $isEN ?? wh_is_en();
    $part = trim((string) ($input['material_code'] ?? $input['HanaPart'] ?? ''));
    $puid = trim((string) ($input['puid'] ?? $input['PUID'] ?? ''));

    if ($part !== '') {
        $row = wh_fetch_first_active_inventory_by_part($condb, $part);
        if (!$row) {
            if (wh_part_has_layout_slot($condb, $part)) {
                return wh_msg($isEN, 'no_material_at_position', [$part]);
            }

            return wh_msg($isEN, 'no_material', [$part]);
        }

        $loc = wh_format_loc_hint($row);
        if ($loc === '') {
            return wh_msg($isEN, 'no_storage_loc', [$part]);
        }

        return wh_msg($isEN, 'no_layout_for_loc', [$part . ' · ' . $loc]);
    }

    if ($puid !== '') {
        $row = wh_fetch_first_active_inventory_by_puid($condb, $puid);
        if (!$row) {
            return wh_msg($isEN, 'no_puid', [$puid]);
        }

        $partLabel = trim((string) ($row['HanaPart'] ?? ''));
        $loc = wh_format_loc_hint($row);
        if ($loc === '') {
            return wh_msg($isEN, 'no_storage_loc', [$puid . ($partLabel !== '' ? ' (' . $partLabel . ')' : '')]);
        }

        return wh_msg($isEN, 'no_layout_for_loc', [$puid . ' · ' . $loc]);
    }

    return wh_msg($isEN, 'location_not_found');
}

function wh_tv_highlight_file(): string
{
    return __DIR__ . '/../data/tv_highlight.json';
}

/**
 * @param array<string, mixed> $data
 * @return array<string, mixed>
 */
function wh_build_highlight_payload(array $data): array
{
    $duration = io_highlight_duration_sec();
    $slotNo = $data['slot_no'] ?? $data['Loc_Slot'] ?? '';

    return [
        'product_name' => (string) ($data['product_name'] ?? $data['HanaPart'] ?? ''),
        'puid' => (string) ($data['puid'] ?? $data['PUID'] ?? ''),
        'box_id' => (int) ($data['box_id'] ?? 0),
        'slot_id' => (int) ($data['slot_id'] ?? 0),
        'slot_no' => $slotNo,
        'box_code' => (string) ($data['box_code'] ?? $data['Loc_Box'] ?? ''),
        'level_no' => $data['level_no'] ?? $data['Loc_Level'] ?? '',
        'rack_name' => (string) ($data['rack_name'] ?? $data['Loc_Shelf'] ?? ''),
        'qty' => $data['qty'] ?? $data['QtyRemain'] ?? $data['Qty'] ?? 0,
        'searched_by' => (string) ($data['searched_by'] ?? ($_SESSION['username'] ?? 'User')),
        'searched_at' => date('H:i:s'),
        'updated_at' => time(),
        'highlight_seq' => (string) ($data['highlight_seq'] ?? uniqid('hl', true)),
        'expires_at' => time() + $duration,
        'action_type' => (string) ($data['action_type'] ?? 'highlight'),
        'expiration_display' => (string) ($data['expiration_display'] ?? ''),
        'expiry_status' => (string) ($data['expiry_status'] ?? ''),
        'expiry_highlight' => (string) ($data['expiry_highlight'] ?? ''),
    ];
}

/**
 * Defer Raspi/IO highlight to shutdown so TV/3D file write returns immediately.
 */
function wh_defer_io_highlight_enabled(): bool
{
    return strtolower(trim((string) (env('IO_HIGHLIGHT_DEFER', 'true') ?? 'true'))) !== 'false';
}

function wh_schedule_io_switch(
    int $boxId,
    ?int $slotNo,
    int $previousBoxId = 0,
    ?int $previousSlotNo = null
): void {
    register_shutdown_function(static function () use ($boxId, $slotNo, $previousBoxId, $previousSlotNo) {
        if (function_exists('fastcgi_finish_request')) {
            @fastcgi_finish_request();
        }

        try {
            require_once __DIR__ . '/condb.php';
            require_once __DIR__ . '/io_device_service.php';
            global $condb;
            if (!isset($condb) || !($condb instanceof mysqli)) {
                return;
            }
            io_switch_highlight_box(
                $condb,
                $boxId,
                $slotNo,
                $previousBoxId > 0 ? $previousBoxId : null,
                $previousSlotNo
            );
        } catch (Throwable $e) {
            error_log('wh_schedule_io_switch: ' . $e->getMessage());
        }
    });
}

function wh_read_tv_highlight(): ?array
{
    $file = wh_tv_highlight_file();
    if (!is_file($file)) {
        return null;
    }

    $data = json_decode((string) file_get_contents($file), true);

    return is_array($data) ? $data : null;
}

/**
 * @param array<string, mixed> $data
 */
function wh_push_tv_highlight(array $data): bool
{
    $payload = wh_build_highlight_payload($data);
    if ($payload['box_id'] <= 0) {
        return false;
    }

    $file = wh_tv_highlight_file();
    $dir = dirname($file);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }

    return @file_put_contents(
        $file,
        json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    ) !== false;
}

/**
 * Push highlight to TV/3D file and trigger IO lights for a box.
 *
 * @param array<string, mixed> $data
 * @return array{status: string, message?: string, tv?: bool, io?: array, highlight?: array}
 */
function wh_highlight_location(mysqli $condb, array $data, bool $triggerIo = true, ?bool $isEN = null): array
{
    $isEN = $isEN ?? wh_is_en();
    $boxId = (int) ($data['box_id'] ?? 0);
    if ($boxId <= 0) {
        return [
            'status' => 'error',
            'message' => wh_highlight_failure_message($condb, $data, $isEN),
        ];
    }

    $slotNoRaw = $data['slot_no'] ?? $data['Loc_Slot'] ?? null;
    $slotNo = ($slotNoRaw !== null && $slotNoRaw !== '') ? (int) $slotNoRaw : null;

    $previous = wh_read_tv_highlight();
    $tvOk = wh_push_tv_highlight($data);
    $ioResult = ['status' => 'skipped', 'message' => 'IO not requested'];

    if ($triggerIo) {
        $prevBoxId = (int) ($previous['box_id'] ?? 0);
        $prevSlotRaw = $previous['slot_no'] ?? null;
        $prevSlotNo = ($prevSlotRaw !== null && $prevSlotRaw !== '') ? (int) $prevSlotRaw : null;

        if (wh_defer_io_highlight_enabled()) {
            wh_schedule_io_switch($boxId, $slotNo, $prevBoxId, $prevSlotNo);
            $ioResult = ['status' => 'deferred', 'message' => 'IO highlight scheduled after response'];
        } else {
            $ioResult = io_switch_highlight_box($condb, $boxId, $slotNo, $prevBoxId, $prevSlotNo);
        }
    }

    if (!$tvOk) {
        return [
            'status' => 'error',
            'message' => wh_msg($isEN, 'tv_write_failed'),
            'tv' => false,
            'io' => $ioResult,
        ];
    }

    return [
        'status' => 'success',
        'message' => wh_msg($isEN, 'highlight_ok'),
        'tv' => true,
        'io' => $ioResult,
        'highlight' => wh_build_highlight_payload($data),
    ];
}

/**
 * Map Loc_Shelf / Loc_Level / Loc_Box from inventory_receive to box_id in layout tables.
 *
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function wh_merge_box_from_loc_fields(mysqli $condb, array $row): array
{
    if (!empty($row['box_id'])) {
        return $row;
    }
    if (empty($row['Loc_Shelf']) || empty($row['Loc_Box'])) {
        return $row;
    }

    $locStmt = $condb->prepare("
        SELECT bx.id AS box_id, bx.box_code, lv.level_no, r.name AS rack_name
        FROM boxes bx
        JOIN levels lv ON bx.level_id = lv.id
        JOIN racks r ON lv.rack_id = r.id
        WHERE r.name = ? AND lv.level_no = ? AND bx.box_code = ?
        LIMIT 1
    ");
    $levelNo = (int) ($row['Loc_Level'] ?? 0);
    $shelf = (string) $row['Loc_Shelf'];
    $boxCode = (string) $row['Loc_Box'];
    $locStmt->bind_param('sis', $shelf, $levelNo, $boxCode);
    $locStmt->execute();
    $loc = $locStmt->get_result()->fetch_assoc();
    $locStmt->close();

    if ($loc) {
        return array_merge($row, $loc);
    }

    return $row;
}

/**
 * Attach slot from products when FIFO / Loc fields only have box-level data.
 *
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function wh_enrich_slot_from_products(mysqli $condb, array $row): array
{
    if (!empty($row['slot_id'])) {
        return $row;
    }

    $part = trim((string) ($row['HanaPart'] ?? $row['product_name'] ?? ''));
    if ($part === '') {
        return $row;
    }

    $stmt = $condb->prepare("
        SELECT sl.id AS slot_id, sl.slot_no
        FROM products p
        JOIN slots sl ON p.slot_id = sl.id
        WHERE p.name = ? AND p.qty > 0
        ORDER BY p.qty DESC
        LIMIT 1
    ");
    $stmt->bind_param('s', $part);
    $stmt->execute();
    $slot = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($slot) {
        $row['slot_id'] = (int) $slot['slot_id'];
        $row['slot_no'] = $slot['slot_no'];
    }

    return $row;
}

/**
 * Resolve storage location for a material code (FIFO stock first, then products map).
 *
 * @return array<string, mixed>|null
 */
function wh_resolve_location_by_material(mysqli $condb, string $materialCode): ?array
{
    require_once __DIR__ . '/fifo_service.php';

    $materialCode = fifo_normalize_part($materialCode);
    if ($materialCode === '') {
        return null;
    }

    $tryRow = static function (array $row) use ($condb): ?array {
        $row = wh_merge_box_from_loc_fields($condb, $row);
        $row = wh_enrich_slot_from_products($condb, $row);
        if (empty($row['box_id'])) {
            return null;
        }
        $row['product_name'] = $row['HanaPart'] ?? ($row['product_name'] ?? '');

        return $row;
    };

    $irRow = fifo_fetch_recommended_inventory_row($condb, $materialCode);
    if ($irRow) {
        $resolved = $tryRow($irRow);
        if ($resolved) {
            $resolved['puid'] = $resolved['PUID'] ?? ($irRow['PUID'] ?? '');

            return $resolved;
        }

        if (!empty($irRow['PUID'])) {
            $byPuid = wh_resolve_location_by_puid($condb, (string) $irRow['PUID']);
            if ($byPuid) {
                return $byPuid;
            }
        }
    }

    $invStmt = $condb->prepare("
        SELECT ir.PUID, ir.HanaPart, ir.QtyRemain, ir.IM,
               ir.Loc_Shelf, ir.Loc_Level, ir.Loc_Box, ir.ExpirationDate
        FROM inventory_receive ir
        WHERE ir.HanaPart = ?
          AND ir.QtyRemain > 0
          AND ir.StatusName NOT IN ('Withdrawn', 'Empty')
        ORDER BY ir.ExpirationDate ASC, ir.ReceiveDate ASC
        LIMIT 10
    ");
    if ($invStmt) {
        $invStmt->bind_param('s', $materialCode);
        $invStmt->execute();
        $invRes = $invStmt->get_result();
        while ($invRow = $invRes->fetch_assoc()) {
            $resolved = $tryRow($invRow);
            if ($resolved) {
                $resolved['puid'] = $resolved['PUID'] ?? ($invRow['PUID'] ?? '');
                $invStmt->close();

                return $resolved;
            }
            if (!empty($invRow['PUID'])) {
                $byPuid = wh_resolve_location_by_puid($condb, (string) $invRow['PUID']);
                if ($byPuid) {
                    $invStmt->close();

                    return $byPuid;
                }
            }
        }
        $invStmt->close();
    }

    $stmt = $condb->prepare("
        SELECT b.id AS box_id, b.box_code, sl.id AS slot_id, sl.slot_no,
               l.level_no, r.name AS rack_name, p.qty, p.name AS HanaPart
        FROM products p
        JOIN slots sl ON p.slot_id = sl.id
        JOIN boxes b ON sl.box_id = b.id
        JOIN levels l ON b.level_id = l.id
        JOIN racks r ON l.rack_id = r.id
        WHERE p.name = ?
          AND (
            p.qty > 0
            OR EXISTS (
                SELECT 1 FROM inventory_receive ir
                WHERE ir.HanaPart = p.name
                  AND ir.QtyRemain > 0
                  AND ir.StatusName NOT IN ('Withdrawn', 'Empty')
            )
          )
        ORDER BY p.qty DESC, r.name, l.level_no, b.box_code
        LIMIT 1
    ");
    $stmt->bind_param('s', $materialCode);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!empty($row['box_id'])) {
        $row['product_name'] = $row['HanaPart'] ?? $materialCode;

        return $row;
    }

    return null;
}

/**
 * Active PUID rows in a box slot (inventory_receive — not stock_logs).
 *
 * @return list<string>
 */
function wh_fetch_puids_for_box_slot(
    mysqli $condb,
    string $hanaPart,
    int $slotId,
    string $rackName,
    int $levelNo,
    string $boxCode
): array {
    require_once __DIR__ . '/inventory_api_service.php';

    $hanaPart = trim($hanaPart);
    if ($hanaPart === '') {
        return [];
    }

    $puids = [];

    if ($slotId > 0) {
        $stmt = $condb->prepare("
            SELECT DISTINCT ir.PUID
            FROM inventory_receive ir
            JOIN products p ON p.name = ir.HanaPart AND p.slot_id = ?
            WHERE ir.HanaPart = ?
              AND ir.QtyRemain > 0
              AND ir.StatusName NOT IN ('Withdrawn', 'Empty')
            ORDER BY ir.ReceiveDate ASC
        ");
        if ($stmt) {
            $stmt->bind_param('is', $slotId, $hanaPart);
            $stmt->execute();
            $res = $stmt->get_result();
            while ($r = $res->fetch_assoc()) {
                $p = trim((string) ($r['PUID'] ?? ''));
                if ($p !== '') {
                    $puids[] = $p;
                }
            }
            $stmt->close();
        }
    }

    if ($puids === [] && $rackName !== '' && $boxCode !== '') {
        $stmt = $condb->prepare("
            SELECT DISTINCT ir.PUID
            FROM inventory_receive ir
            WHERE ir.HanaPart = ?
              AND ir.QtyRemain > 0
              AND ir.StatusName NOT IN ('Withdrawn', 'Empty')
              AND ir.Loc_Shelf = ?
              AND CAST(ir.Loc_Level AS UNSIGNED) = ?
              AND ir.Loc_Box = ?
            ORDER BY ir.ReceiveDate ASC
        ");
        if ($stmt) {
            $stmt->bind_param('ssis', $hanaPart, $rackName, $levelNo, $boxCode);
            $stmt->execute();
            $res = $stmt->get_result();
            while ($r = $res->fetch_assoc()) {
                $p = trim((string) ($r['PUID'] ?? ''));
                if ($p !== '') {
                    $puids[] = $p;
                }
            }
            $stmt->close();
        }
    }

    return array_values(array_unique($puids));
}

/**
 * Resolve storage location from PUID via inventory_receive + products map.
 *
 * @return array<string, mixed>|null
 */
function wh_resolve_location_by_puid(mysqli $condb, string $puid): ?array
{
    require_once __DIR__ . '/inventory_api_service.php';

    $candidates = inventory_puid_lookup_candidates($puid);
    if ($candidates === []) {
        return null;
    }

    $upper = array_map('strtoupper', $candidates);
    $placeholders = implode(',', array_fill(0, count($upper), '?'));

    $sql = "
        SELECT ir.PUID, ir.HanaPart, ir.QtyRemain, ir.IM,
               ir.Loc_Shelf, ir.Loc_Level, ir.Loc_Box,
               sl.id AS slot_id, sl.slot_no,
               bx.id AS box_id, bx.box_code,
               lv.level_no, r.name AS rack_name
        FROM inventory_receive ir
        LEFT JOIN products p ON p.name = ir.HanaPart AND p.qty > 0
        LEFT JOIN slots sl ON p.slot_id = sl.id
        LEFT JOIN boxes bx ON sl.box_id = bx.id
        LEFT JOIN levels lv ON bx.level_id = lv.id
        LEFT JOIN racks r ON lv.rack_id = r.id
        WHERE UPPER(ir.PUID) IN ({$placeholders})
          AND ir.QtyRemain > 0
          AND ir.StatusName NOT IN ('Withdrawn', 'Empty')
        ORDER BY p.qty DESC
        LIMIT 1
    ";

    $stmt = $condb->prepare($sql);
    if (!$stmt) {
        return null;
    }

    $types = str_repeat('s', count($upper));
    $stmt->bind_param($types, ...$upper);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        return null;
    }

    $row = wh_merge_box_from_loc_fields($condb, $row);

    if (empty($row['box_id']) && !empty($row['HanaPart'])) {
        $fallback = wh_resolve_location_by_material($condb, $row['HanaPart']);
        if ($fallback) {
            $row = array_merge($row, $fallback);
        }
    }

    return !empty($row['box_id']) ? $row : null;
}

/**
 * @param array<string, mixed> $data
 */
function wh_highlight_from_proxy_data(mysqli $condb, array $data, string $actionType = 'highlight'): array
{
    $payload = array_merge($data, [
        'action_type' => $actionType,
        'product_name' => $data['product_name'] ?? $data['HanaPart'] ?? '',
        'puid' => $data['puid'] ?? $data['PUID'] ?? '',
        'rack_name' => $data['rack_name'] ?? $data['Loc_Shelf'] ?? '',
        'box_code' => $data['box_code'] ?? $data['Loc_Box'] ?? '',
        'level_no' => $data['level_no'] ?? $data['Loc_Level'] ?? '',
        'slot_no' => $data['slot_no'] ?? $data['Loc_Slot'] ?? '',
        'qty' => $data['qty'] ?? $data['QtyRemain'] ?? 0,
    ]);

    return wh_highlight_location($condb, $payload, true);
}
