<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require_once __DIR__ . '/../config/condb.php';
$res = $condb->query('SELECT id, order_no, created_at FROM production_orders ORDER BY id DESC LIMIT 5');
while ($row = $res->fetch_assoc()) {
    echo "ID: {$row['id']} | No: {$row['order_no']} | Created: {$row['created_at']}\n";
}
