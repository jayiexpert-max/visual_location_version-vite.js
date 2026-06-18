<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require_once __DIR__ . '/../config/condb.php';

echo "PHP Time (date): " . date('Y-m-d H:i:s') . "\n";
echo "PHP Timezone: " . date_default_timezone_get() . "\n";

$res = $condb->query('SELECT NOW() as n, @@session.time_zone as tz, @@global.time_zone as gtz');
$row = $res->fetch_assoc();
echo "MySQL NOW(): " . $row['n'] . "\n";
echo "MySQL Session TZ: " . $row['tz'] . "\n";
echo "MySQL Global TZ: " . $row['gtz'] . "\n";

echo "\nLatest Production Orders:\n";
$res = $condb->query('SELECT id, order_no, created_at FROM production_orders ORDER BY id DESC LIMIT 3');
while ($row = $res->fetch_assoc()) {
    echo "ID: {$row['id']} | Order: {$row['order_no']} | Created: {$row['created_at']}\n";
}
