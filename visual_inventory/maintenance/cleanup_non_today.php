<?php
/**
 * CLI: Delete stock_logs, inventory_receive, reservation_list not on target date.
 * Usage: php maintenance/cleanup_non_today.php [--dry-run]
 */

require_once __DIR__ . '/../config/database.php';

$dryRun = in_array('--dry-run', $argv ?? [], true);
$targetDate = '2026-06-01';

$db = db_mysqli();
$db->query('SET SESSION sql_safe_updates = 0');

function countWhere(mysqli $db, string $sql, string $date): int
{
    $st = $db->prepare($sql);
    $st->bind_param('s', $date);
    $st->execute();
    $row = $st->get_result()->fetch_row();
    $st->close();

    return (int) ($row[0] ?? 0);
}

function deleteWhere(mysqli $db, string $sql, string $date): int
{
    $st = $db->prepare($sql);
    $st->bind_param('s', $date);
    $st->execute();
    $affected = $st->affected_rows;
    $st->close();

    return $affected;
}

echo "Target date (KEEP): {$targetDate}\n";
echo $dryRun ? "MODE: dry-run\n\n" : "MODE: DELETE\n\n";

echo "=== BEFORE ===\n";
$before = [
    'reservation_delete' => countWhere($db, 'SELECT COUNT(*) FROM reservation_list WHERE DATE(req_date) <> ?', $targetDate),
    'reservation_keep' => countWhere($db, 'SELECT COUNT(*) FROM reservation_list WHERE DATE(req_date) = ?', $targetDate),
    'logs_delete' => countWhere($db, 'SELECT COUNT(*) FROM stock_logs WHERE DATE(created_at) <> ?', $targetDate),
    'logs_keep' => countWhere($db, 'SELECT COUNT(*) FROM stock_logs WHERE DATE(created_at) = ?', $targetDate),
    'puid_delete' => countWhere($db, 'SELECT COUNT(*) FROM inventory_receive WHERE DATE(created_at) <> ?', $targetDate),
    'puid_keep' => countWhere($db, 'SELECT COUNT(*) FROM inventory_receive WHERE DATE(created_at) = ?', $targetDate),
];
foreach ($before as $k => $v) {
    echo "  {$k}: {$v}\n";
}

if ($dryRun) {
    exit(0);
}

$db->begin_transaction();

try {
    $deletedRes = deleteWhere($db, 'DELETE FROM reservation_list WHERE DATE(req_date) <> ?', $targetDate);
    $deletedLogs = deleteWhere($db, 'DELETE FROM stock_logs WHERE DATE(created_at) <> ?', $targetDate);
    $deletedPuid = deleteWhere($db, 'DELETE FROM inventory_receive WHERE DATE(created_at) <> ?', $targetDate);

    $db->query('UPDATE products SET qty = 0');

    $syncSql = <<<'SQL'
UPDATE products p
INNER JOIN (
    SELECT ir.HanaPart, ir.Loc_Shelf, ir.Loc_Level, ir.Loc_Box,
           COUNT(*) AS cnt
    FROM inventory_receive ir
    WHERE ir.QtyRemain > 0
      AND ir.StatusName NOT IN ('Withdrawn', 'Empty')
    GROUP BY ir.HanaPart, ir.Loc_Shelf, ir.Loc_Level, ir.Loc_Box
) x ON p.name = x.HanaPart
INNER JOIN slots sl ON p.slot_id = sl.id
INNER JOIN boxes bx ON sl.box_id = bx.id
INNER JOIN levels lv ON bx.level_id = lv.id
INNER JOIN racks r ON lv.rack_id = r.id
   AND r.name = x.Loc_Shelf
   AND CAST(lv.level_no AS CHAR) = CAST(x.Loc_Level AS CHAR)
   AND bx.box_code = x.Loc_Box
SET p.qty = x.cnt
SQL;
    $db->query($syncSql);
    $productsUpdated = $db->affected_rows;

    $db->commit();

    echo "\n=== DELETED ===\n";
    echo "  reservation_list: {$deletedRes}\n";
    echo "  stock_logs: {$deletedLogs}\n";
    echo "  inventory_receive: {$deletedPuid}\n";
    echo "  products qty synced rows: {$productsUpdated}\n";

    echo "\n=== AFTER ===\n";
    $res = $db->query('SELECT COUNT(*) AS c FROM reservation_list')->fetch_assoc();
    echo '  reservation_list total: ' . (int) $res['c'] . "\n";
    $res = $db->query('SELECT COUNT(*) AS c FROM stock_logs')->fetch_assoc();
    echo '  stock_logs total: ' . (int) $res['c'] . "\n";
    $res = $db->query('SELECT COUNT(*) AS c FROM inventory_receive')->fetch_assoc();
    echo '  inventory_receive total: ' . (int) $res['c'] . "\n";
} catch (Throwable $e) {
    $db->rollback();
    fwrite(STDERR, 'FAILED: ' . $e->getMessage() . "\n");
    exit(1);
}
