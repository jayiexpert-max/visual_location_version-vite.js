<?php

/**
 * Fetch box slot layout with product info and PUIDs (single implementation for api + public proxy).
 *
 * @return array{slots: array<int, array>, layout: string, error?: string}
 */
function box_layout_fetch(mysqli $condb, int $box_id, int $highlight_slot_id = 0): array
{
    if ($box_id <= 0) {
        return ['slots' => [], 'layout' => '3x3', 'error' => 'No box_id provided'];
    }

    require_once __DIR__ . '/warehouse_highlight_service.php';

    $boxCtx = ['rack_name' => '', 'level_no' => 0, 'box_code' => ''];
    $ctxStmt = $condb->prepare("
        SELECT b.box_code, l.level_no, r.name AS rack_name
        FROM boxes b
        JOIN levels l ON b.level_id = l.id
        JOIN racks r ON l.rack_id = r.id
        WHERE b.id = ?
        LIMIT 1
    ");
    if ($ctxStmt) {
        $ctxStmt->bind_param('i', $box_id);
        $ctxStmt->execute();
        $ctxRow = $ctxStmt->get_result()->fetch_assoc();
        $ctxStmt->close();
        if ($ctxRow) {
            $boxCtx['rack_name'] = trim((string) ($ctxRow['rack_name'] ?? ''));
            $boxCtx['level_no'] = (int) ($ctxRow['level_no'] ?? 0);
            $boxCtx['box_code'] = trim((string) ($ctxRow['box_code'] ?? ''));
        }
    }

    $slots = [];

    $sql = "
        SELECT sl.id, sl.slot_no, sl.box_id, p.id AS product_id, p.name, p.qty
        FROM slots sl
        LEFT JOIN products p ON sl.id = p.slot_id
        WHERE sl.box_id = ?
        ORDER BY sl.slot_no ASC
    ";

    $stmt = $condb->prepare($sql);
    if (!$stmt) {
        return ['slots' => [], 'layout' => '3x3', 'error' => $condb->error];
    }

    $stmt->bind_param('i', $box_id);
    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $qty = (int) ($row['qty'] ?? 0);
        $slotId = (int) ($row['id'] ?? 0);
        $hanaPart = trim((string) ($row['name'] ?? ''));
        $puids = [];

        if ($hanaPart !== '') {
            $puids = wh_fetch_puids_for_box_slot(
                $condb,
                $hanaPart,
                $slotId,
                $boxCtx['rack_name'],
                $boxCtx['level_no'],
                $boxCtx['box_code']
            );
        }

        $puidCount = count($puids);
        if ($puidCount > 0) {
            $qty = max($qty, $puidCount);
        }

        $slots[] = [
            'id' => $slotId,
            'slot_no' => $row['slot_no'],
            'highlight' => ($slotId === $highlight_slot_id),
            'name' => $hanaPart !== '' ? $hanaPart : null,
            'qty' => $qty,
            'puids' => $puids,
        ];
    }
    $stmt->close();

    $layout = '3x3';
    $boxStmt = $condb->prepare('SELECT layout FROM boxes WHERE id = ?');
    if ($boxStmt) {
        $boxStmt->bind_param('i', $box_id);
        $boxStmt->execute();
        $boxInfo = $boxStmt->get_result()->fetch_assoc();
        if ($boxInfo && !empty($boxInfo['layout'])) {
            $layout = $boxInfo['layout'];
        }
        $boxStmt->close();
    }

    return ['slots' => $slots, 'layout' => $layout];
}

/**
 * @deprecated Use wh_fetch_puids_for_box_slot() via box_layout_fetch().
 * @param int[] $productIds
 * @return array<int, string[]>
 */
function box_layout_fetch_puids_batch(mysqli $condb, array $productIds): array
{
    require_once __DIR__ . '/warehouse_highlight_service.php';

    $productIds = array_values(array_unique(array_filter(array_map('intval', $productIds))));
    if ($productIds === []) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    $types = str_repeat('i', count($productIds));

    $sql = "SELECT p.id AS product_id, p.name AS hana_part, p.slot_id,
                   bx.box_code, lv.level_no, r.name AS rack_name
            FROM products p
            JOIN slots sl ON sl.id = p.slot_id
            JOIN boxes bx ON sl.box_id = bx.id
            JOIN levels lv ON bx.level_id = lv.id
            JOIN racks r ON lv.rack_id = r.id
            WHERE p.id IN ($placeholders)";

    $stmt = $condb->prepare($sql);
    if (!$stmt) {
        return [];
    }

    $stmt->bind_param($types, ...$productIds);
    $stmt->execute();
    $res = $stmt->get_result();

    $puidsByProduct = [];
    while ($row = $res->fetch_assoc()) {
        $pid = (int) ($row['product_id'] ?? 0);
        $hanaPart = trim((string) ($row['hana_part'] ?? ''));
        if ($pid <= 0 || $hanaPart === '') {
            continue;
        }

        $puidsByProduct[$pid] = wh_fetch_puids_for_box_slot(
            $condb,
            $hanaPart,
            (int) ($row['slot_id'] ?? 0),
            trim((string) ($row['rack_name'] ?? '')),
            (int) ($row['level_no'] ?? 0),
            trim((string) ($row['box_code'] ?? ''))
        );
    }
    $stmt->close();

    return $puidsByProduct;
}
