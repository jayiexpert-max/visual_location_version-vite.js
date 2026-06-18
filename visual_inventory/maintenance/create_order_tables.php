<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require_once __DIR__ . '/../config/condb.php';

$sql = "
CREATE TABLE IF NOT EXISTS production_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status ENUM('pending', 'preparing', 'completed', 'cancelled') DEFAULT 'pending',
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    material_id INT NOT NULL,
    target_qty INT NOT NULL,
    picked_qty INT DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES production_orders(id) ON DELETE CASCADE
);
";

if ($condb->multi_query($sql)) {
    do {
        if ($res = $condb->store_result()) {
            $res->free();
        }
    } while ($condb->more_results() && $condb->next_result());
    echo "Tables created successfully";
} else {
    echo "Error creating tables: " . $condb->error;
}
?>