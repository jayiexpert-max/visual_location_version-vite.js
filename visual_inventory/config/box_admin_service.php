<?php

/**
 * Admin helpers for box layout slots and product mapping order.
 */

function box_layout_dimensions(string $layout): array
{
    $parts = explode('x', strtolower(trim($layout)));
    $w = max(1, (int) ($parts[0] ?? 1));
    $h = max(1, (int) ($parts[1] ?? 1));

    return [$w, $h, $w * $h];
}

/**
 * Create slots 1..N for a new box.
 */
function box_admin_create_slots(mysqli $condb, int $box_id, string $layout): int
{
    [, , $total] = box_layout_dimensions($layout);
    $stmt = $condb->prepare('INSERT INTO slots (box_id, slot_no) VALUES (?, ?)');
    $created = 0;

    for ($i = 1; $i <= $total; $i++) {
        $stmt->bind_param('ii', $box_id, $i);
        if ($stmt->execute()) {
            $created++;
        }
    }
    $stmt->close();

    return $created;
}

/**
 * Resize slots when box layout changes. Keeps existing slot_no + products; adds or removes trailing slots.
 *
 * @return array{ok: bool, message: string, added: int, removed: int}
 */
function box_admin_resize_slots(mysqli $condb, int $box_id, string $new_layout): array
{
    $box_id = (int) $box_id;
    if ($box_id <= 0) {
        return ['ok' => false, 'message' => 'Invalid box id', 'added' => 0, 'removed' => 0];
    }

    [, , $new_total] = box_layout_dimensions($new_layout);

    $stmt = $condb->prepare(
        'SELECT sl.id, sl.slot_no, p.id AS product_id
         FROM slots sl
         LEFT JOIN products p ON p.slot_id = sl.id
         WHERE sl.box_id = ?
         ORDER BY sl.slot_no ASC'
    );
    $stmt->bind_param('i', $box_id);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $max_slot_no = 0;
    foreach ($rows as $row) {
        $max_slot_no = max($max_slot_no, (int) $row['slot_no']);
    }

    $added = 0;
    $removed = 0;

    if ($new_total < $max_slot_no) {
        $blocked = [];
        foreach ($rows as $row) {
            if ((int) $row['slot_no'] > $new_total && !empty($row['product_id'])) {
                $blocked[] = (int) $row['slot_no'];
            }
        }
        if ($blocked !== []) {
            sort($blocked);

            return [
                'ok' => false,
                'message' => 'Cannot shrink layout: slots ' . implode(', ', $blocked) . ' still have products mapped.',
                'added' => 0,
                'removed' => 0,
            ];
        }

        $del = $condb->prepare(
            'DELETE sl FROM slots sl
             LEFT JOIN products p ON p.slot_id = sl.id
             WHERE sl.box_id = ? AND sl.slot_no > ? AND p.id IS NULL'
        );
        $del->bind_param('ii', $box_id, $new_total);
        $del->execute();
        $removed = $del->affected_rows;
        $del->close();
    } elseif ($new_total > $max_slot_no) {
        $ins = $condb->prepare('INSERT INTO slots (box_id, slot_no) VALUES (?, ?)');
        for ($i = $max_slot_no + 1; $i <= $new_total; $i++) {
            $ins->bind_param('ii', $box_id, $i);
            if ($ins->execute()) {
                $added++;
            }
        }
        $ins->close();
    }

    return [
        'ok' => true,
        'message' => 'Slots resized',
        'added' => $added,
        'removed' => $removed,
    ];
}

function box_admin_slot_box_id(mysqli $condb, int $slot_id): int
{
    $stmt = $condb->prepare('SELECT box_id FROM slots WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $slot_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return (int) ($row['box_id'] ?? 0);
}

/**
 * Next empty slot in the same box (slot_no greater than current), else first empty in box, else first empty global.
 */
function box_admin_next_empty_slot(mysqli $condb, int $current_slot_id): ?int
{
    $stmt = $condb->prepare('SELECT box_id, slot_no FROM slots WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $current_slot_id);
    $stmt->execute();
    $current = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$current) {
        return box_admin_first_empty_slot($condb, 0);
    }

    $box_id = (int) $current['box_id'];
    $slot_no = (int) $current['slot_no'];

    $nextInBox = $condb->prepare(
        'SELECT sl.id
         FROM slots sl
         LEFT JOIN products p ON p.slot_id = sl.id
         WHERE sl.box_id = ? AND sl.slot_no > ? AND p.id IS NULL
         ORDER BY sl.slot_no ASC
         LIMIT 1'
    );
    $nextInBox->bind_param('ii', $box_id, $slot_no);
    $nextInBox->execute();
    $row = $nextInBox->get_result()->fetch_assoc();
    $nextInBox->close();
    if ($row) {
        return (int) $row['id'];
    }

    $firstInBox = box_admin_first_empty_slot($condb, $box_id);
    if ($firstInBox !== null && $firstInBox !== $current_slot_id) {
        return $firstInBox;
    }

    return box_admin_first_empty_slot($condb, 0);
}

function box_admin_first_empty_slot(mysqli $condb, int $box_id = 0): ?int
{
    $sql = 'SELECT sl.id
            FROM slots sl
            JOIN boxes b ON sl.box_id = b.id
            JOIN levels l ON b.level_id = l.id
            JOIN racks r ON l.rack_id = r.id
            LEFT JOIN products p ON p.slot_id = sl.id
            WHERE p.id IS NULL';
    if ($box_id > 0) {
        $sql .= ' AND sl.box_id = ' . (int) $box_id;
    }
    $sql .= ' ORDER BY r.name, l.level_no, b.box_code, sl.slot_no ASC LIMIT 1';

    $res = $condb->query($sql);
    $row = $res ? $res->fetch_assoc() : null;

    return $row ? (int) $row['id'] : null;
}

/**
 * @return array<int, array<string, mixed>>
 */
function box_admin_list_boxes(mysqli $condb): array
{
    $sql = "SELECT b.id, b.box_code, b.layout, l.level_no, r.name AS rack_name,
                   COUNT(sl.id) AS slot_total,
                   SUM(CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) AS mapped_count
            FROM boxes b
            JOIN levels l ON b.level_id = l.id
            JOIN racks r ON l.rack_id = r.id
            LEFT JOIN slots sl ON sl.box_id = b.id
            LEFT JOIN products p ON p.slot_id = sl.id
            GROUP BY b.id, b.box_code, b.layout, l.level_no, r.name
            ORDER BY r.name, l.level_no, b.box_code";

    $rows = [];
    $res = $condb->query($sql);
    while ($res && ($row = $res->fetch_assoc())) {
        $rows[] = $row;
    }

    return $rows;
}
