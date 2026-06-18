<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();

date_default_timezone_set('Asia/Bangkok');
header('Content-Type: text/plain');
echo "Default TZ: " . date_default_timezone_get() . "\n";
echo "Current Time: " . date('Y-m-d H:i:s') . "\n";
echo "ini_get('date.timezone'): " . ini_get('date.timezone') . "\n";

require_once __DIR__ . '/../config/condb.php';
$res = $condb->query("SELECT NOW() as n, @@session.time_zone as stz, @@global.time_zone as gtz");
$row = $res->fetch_assoc();
echo "MySQL NOW(): " . $row['n'] . "\n";
echo "MySQL session TZ: " . $row['stz'] . "\n";
echo "MySQL global TZ: " . $row['gtz'] . "\n";
