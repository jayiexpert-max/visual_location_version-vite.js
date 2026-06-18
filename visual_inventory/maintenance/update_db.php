<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require_once __DIR__ . '/../config/condb.php';
$sql = "ALTER TABLE inventory_receive ADD COLUMN ReservationNo VARCHAR(50) AFTER PUID";
if ($condb->query($sql)) {
    echo "Column ReservationNo added successfully";
} else {
    echo "Error: " . $condb->error;
}
