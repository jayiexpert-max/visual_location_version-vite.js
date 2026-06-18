<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require_once __DIR__ . '/../config/condb.php';
$sql = "CREATE TABLE IF NOT EXISTS reservation_list (
    id INT AUTO_INCREMENT PRIMARY KEY,
    res_no VARCHAR(50) UNIQUE,
    req_date DATETIME,
    store VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Pending',
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";
if ($condb->query($sql)) {
    echo "Table reservation_list created successfully";
} else {
    echo "Error: " . $condb->error;
}
