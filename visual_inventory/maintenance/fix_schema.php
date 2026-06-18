<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require_once __DIR__ . '/../config/condb.php';

// Attempt to alter the 'action' column to support longer strings (for storing PUID/Qty)
// We change it to VARCHAR(255) to be safe.
$sql = "ALTER TABLE stock_logs MODIFY COLUMN action VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL";

if ($condb->query($sql) === TRUE) {
    echo "Database Schema Updated Successfully: 'action' column is now VARCHAR(255).";
} else {
    echo "Error updating schema: " . $condb->error;
}
