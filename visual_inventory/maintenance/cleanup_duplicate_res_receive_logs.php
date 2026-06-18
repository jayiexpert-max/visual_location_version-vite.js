<?php
/**
 * CLI: Remove duplicate res_receive stock_logs (same PUID + RES remark, keep oldest).
 * Usage: php maintenance/cleanup_duplicate_res_receive_logs.php [--dry-run]
 */
require_once __DIR__ . '/../config/condb.php';

$dryRun = in_array('--dry-run', $argv ?? [], true);

$sql = "
SELECT s.id, SUBSTRING_INDEX(s.action, '|', -1) AS puid, s.action, s.remark, s.created_at
FROM stock_logs s
INNER JOIN (
    SELECT SUBSTRING_INDEX(action, '|', -1) AS puid, MIN(id) AS keep_id
    FROM stock_logs
    WHERE action LIKE 'res_receive|%'
    GROUP BY SUBSTRING_INDEX(action, '|', -1), IFNULL(remark, '')
    HAVING COUNT(*) > 1
) d ON SUBSTRING_INDEX(s.action, '|', -1) = d.puid
    AND IFNULL(s.remark, '') = (
        SELECT IFNULL(remark, '') FROM stock_logs WHERE id = d.keep_id LIMIT 1
    )
    AND s.id > d.keep_id
WHERE s.action LIKE 'res_receive|%'
ORDER BY s.id
";

$res = $condb->query($sql);
$toDelete = [];
while ($row = $res->fetch_assoc()) {
    $toDelete[] = $row;
}

if ($toDelete === []) {
    echo "No duplicate res_receive logs found.\n";
    exit(0);
}

echo ($dryRun ? '[DRY RUN] ' : '') . 'Duplicate res_receive logs to remove (' . count($toDelete) . "):\n";
foreach ($toDelete as $row) {
    echo sprintf(
        "  #%d %s %s @ %s\n",
        $row['id'],
        $row['action'],
        $row['remark'] ?? '',
        $row['created_at']
    );
}

if ($dryRun) {
    exit(0);
}

$ids = array_map(static fn ($r) => (int) $r['id'], $toDelete);
$placeholders = implode(',', array_fill(0, count($ids), '?'));
$del = $condb->prepare("DELETE FROM stock_logs WHERE id IN ($placeholders)");
$types = str_repeat('i', count($ids));
$del->bind_param($types, ...$ids);
$del->execute();
echo 'Deleted: ' . $del->affected_rows . " row(s)\n";
$del->close();
