<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require __DIR__ . '/../config/condb.php';
$stmt = $condb->query("ALTER TABLE users MODIFY COLUMN role ENUM('admin','user','material_prep') DEFAULT 'user'");
if ($stmt) echo "Success";
else echo "Error: " . $condb->error;
?>
