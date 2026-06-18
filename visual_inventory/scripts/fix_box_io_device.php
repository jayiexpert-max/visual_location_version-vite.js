<?php
require_once __DIR__ . '/../config/condb.php';

$from = (int) ($argv[1] ?? 1);
$to = (int) ($argv[2] ?? 2);

$stmt = $condb->prepare('UPDATE boxes SET io_device_id = ? WHERE io_device_id = ?');
$stmt->bind_param('ii', $to, $from);
$stmt->execute();
echo 'boxes updated: ' . $stmt->affected_rows . PHP_EOL;
