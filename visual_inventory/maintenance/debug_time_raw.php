<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require_once __DIR__ . '/../config/condb.php';

echo "PHP Timezone: " . date_default_timezone_get() . "\n";
echo "PHP date('H:i'): " . date('H:i') . "\n";

$res = $condb->query("SELECT order_no, created_at FROM production_orders ORDER BY id DESC LIMIT 3");
while ($row = $res->fetch_assoc()) {
    echo "Order: {$row['order_no']} | Raw DB: {$row['created_at']} | Formatted: " . date('H:i', strtotime($row['created_at'])) . "\n";
}
