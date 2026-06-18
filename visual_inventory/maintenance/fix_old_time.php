<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require_once __DIR__ . '/../config/condb.php';

// 1. แก้ไขเวลาใน production_orders (ของวันนี้)
$sql1 = "UPDATE production_orders 
         SET created_at = DATE_ADD(created_at, INTERVAL 7 HOUR) 
         WHERE DATE(created_at) = '2026-01-08' AND HOUR(created_at) < 17";
$condb->query($sql1);
echo "Updated production_orders: " . $condb->affected_rows . " rows.\n";

// 2. แก้ไขเวลาใน stock_logs (ของวันนี้)
$sql2 = "UPDATE stock_logs 
         SET created_at = DATE_ADD(created_at, INTERVAL 7 HOUR) 
         WHERE DATE(created_at) = '2026-01-08' AND HOUR(created_at) < 17";
$condb->query($sql2);
echo "Updated stock_logs: " . $condb->affected_rows . " rows.\n";

// 3. แก้ไขเวลาใน inventory_receive (ถ้ามี)
$sql3 = "UPDATE inventory_receive 
         SET updated_at = DATE_ADD(updated_at, INTERVAL 7 HOUR) 
         WHERE DATE(updated_at) = '2026-01-08' AND HOUR(updated_at) < 17";
$condb->query($sql3);
echo "Updated inventory_receive: " . $condb->affected_rows . " rows.\n";
