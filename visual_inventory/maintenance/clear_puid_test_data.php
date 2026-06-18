<?php
/**
 * CLI: Clear all test PUID receive/issue data.
 *
 * Removes:
 *   - inventory_receive (all PUID rows)
 *   - stock_logs (add / withdraw / issue history)
 *   - reservation_list (receive reservation tests)
 * Resets products.qty to 0 (layout slots kept).
 *
 * Usage:
 *   php maintenance/clear_puid_test_data.php              # preview counts only
 *   php maintenance/clear_puid_test_data.php --dry-run      # same as above
 *   php maintenance/clear_puid_test_data.php --confirm    # execute delete
 */

require_once __DIR__ . '/../config/database.php';

$argv = $argv ?? [];
$dryRun = in_array('--dry-run', $argv, true) || !in_array('--confirm', $argv, true);

$db = db_mysqli();

function tableCount(mysqli $db, string $table): int
{
    $res = $db->query('SELECT COUNT(*) AS c FROM `' . $db->real_escape_string($table) . '`');
    if (!$res) {
        throw new RuntimeException($db->error);
    }

    return (int) ($res->fetch_assoc()['c'] ?? 0);
}

function puidSummary(mysqli $db): array
{
    $res = $db->query(
        "SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN QtyRemain > 0 THEN 1 ELSE 0 END) AS in_stock,
            SUM(CASE WHEN StatusName = 'Withdrawn' THEN 1 ELSE 0 END) AS withdrawn
         FROM inventory_receive"
    );
    $row = $res ? $res->fetch_assoc() : [];

    return [
        'total' => (int) ($row['total'] ?? 0),
        'in_stock' => (int) ($row['in_stock'] ?? 0),
        'withdrawn' => (int) ($row['withdrawn'] ?? 0),
    ];
}

echo "=== Clear PUID test data ===\n";
echo $dryRun ? "MODE: preview (add --confirm to delete)\n\n" : "MODE: DELETE\n\n";

try {
    $summary = puidSummary($db);
    echo "inventory_receive:\n";
    echo "  total rows: {$summary['total']}\n";
    echo "  in stock (QtyRemain > 0): {$summary['in_stock']}\n";
    echo "  withdrawn: {$summary['withdrawn']}\n";
    echo 'stock_logs: ' . tableCount($db, 'stock_logs') . "\n";
    echo 'reservation_list: ' . tableCount($db, 'reservation_list') . "\n";
    echo 'products (qty > 0): ';
    $qtyRes = $db->query('SELECT COUNT(*) AS c FROM products WHERE qty > 0');
    echo (int) ($qtyRes->fetch_assoc()['c'] ?? 0) . "\n\n";

    if ($dryRun) {
        echo "No changes made. Run with --confirm to delete all rows above.\n";
        exit(0);
    }

    $db->query('SET SESSION sql_safe_updates = 0');
    $db->begin_transaction();

    $db->query('DELETE FROM stock_logs');
    $deletedLogs = $db->affected_rows;

    $db->query('DELETE FROM reservation_list');
    $deletedReservations = $db->affected_rows;

    $db->query('DELETE FROM inventory_receive');
    $deletedPuid = $db->affected_rows;

    $db->query('UPDATE products SET qty = 0');
    $productsReset = $db->affected_rows;

    $db->query('ALTER TABLE inventory_receive AUTO_INCREMENT = 1');
    $db->query('ALTER TABLE stock_logs AUTO_INCREMENT = 1');
    $db->query('ALTER TABLE reservation_list AUTO_INCREMENT = 1');

    $db->commit();

    echo "=== DELETED ===\n";
    echo "  stock_logs: {$deletedLogs}\n";
    echo "  reservation_list: {$deletedReservations}\n";
    echo "  inventory_receive: {$deletedPuid}\n";
    echo "  products qty reset: {$productsReset}\n\n";

    echo "=== AFTER ===\n";
    echo 'inventory_receive: ' . tableCount($db, 'inventory_receive') . "\n";
    echo 'stock_logs: ' . tableCount($db, 'stock_logs') . "\n";
    echo 'reservation_list: ' . tableCount($db, 'reservation_list') . "\n";
    echo 'products (qty > 0): ';
    $qtyRes = $db->query('SELECT COUNT(*) AS c FROM products WHERE qty > 0');
    echo (int) ($qtyRes->fetch_assoc()['c'] ?? 0) . "\n";
    echo "\nDone. Layout (racks/slots/products) kept; only PUID stock data cleared.\n";
} catch (Throwable $e) {
    if ($db->errno) {
        $db->rollback();
    }
    fwrite(STDERR, 'FAILED: ' . $e->getMessage() . "\n");
    exit(1);
}
