<?php
/**
 * CLI: Delete one PUID from inventory_receive (+ related stock_logs).
 * Usage: php maintenance/delete_puid_once.php 07R7OZ
 */
require_once __DIR__ . '/../config/condb.php';

$puid = strtoupper(trim($argv[1] ?? ''));
$puid = preg_replace('/^VL/', '', $puid);

if ($puid === '') {
    fwrite(STDERR, "Usage: php maintenance/delete_puid_once.php <PUID>\n");
    exit(1);
}

$stmt = $condb->prepare('SELECT id, PUID, HanaPart, QtyRemain, StatusName, Loc_Shelf, Loc_Level, Loc_Box FROM inventory_receive WHERE PUID = ?');
$stmt->bind_param('s', $puid);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo "No inventory_receive row for PUID: {$puid}\n";
    exit(0);
}

echo "Found:\n" . json_encode($row, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

$hanaPart = $row['HanaPart'] ?? '';
$logPattern = '%|' . $condb->real_escape_string(str_replace('|', '-', $puid));

$logCount = 0;
$logRes = $condb->query("SELECT COUNT(*) AS c FROM stock_logs WHERE action LIKE '{$logPattern}' OR action LIKE '%{$puid}%'");
if ($logRes) {
    $logCount = (int) ($logRes->fetch_assoc()['c'] ?? 0);
}

$condb->begin_transaction();
try {
    $delLogs = $condb->prepare("DELETE FROM stock_logs WHERE action LIKE ? OR action LIKE ?");
    $like1 = '%|' . $puid;
    $like2 = '%' . $puid . '%';
    $delLogs->bind_param('ss', $like1, $like2);
    $delLogs->execute();
    $deletedLogs = $delLogs->affected_rows;
    $delLogs->close();

    $delInv = $condb->prepare('DELETE FROM inventory_receive WHERE PUID = ?');
    $delInv->bind_param('s', $puid);
    $delInv->execute();
    $deletedInv = $delInv->affected_rows;
    $delInv->close();

    $condb->commit();

    echo "Deleted inventory_receive: {$deletedInv} row(s)\n";
    echo "Deleted stock_logs: {$deletedLogs} row(s) (had ~{$logCount} matching before)\n";
    echo "Note: products.qty in layout was NOT auto-decremented. Adjust layout manually if needed for {$hanaPart}.\n";
} catch (Throwable $e) {
    $condb->rollback();
    fwrite(STDERR, 'Error: ' . $e->getMessage() . "\n");
    exit(1);
}
