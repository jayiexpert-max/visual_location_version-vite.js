<?php
if (PHP_SAPI !== 'cli') {
    require_once __DIR__ . '/../config/maintenance_guard.php';
    maintenance_dev_admin_guard();
}
require __DIR__ . '/../config/condb.php';

echo "Fixing database views...\n";

$sql1 = "DROP VIEW IF EXISTS `v_stock_history`";
$condb->query($sql1);

$sql2 = "CREATE VIEW `v_stock_history` AS 
SELECT 
    `l`.`id` AS `log_id`, 
    `u`.`username` AS `username`, 
    `u`.`role` AS `role`, 
    `p`.`name` AS `part_name`, 
    `l`.`action` AS `action`, 
    substring_index(`l`.`action`,'|',1) AS `action_type`, 
    `l`.`quantity` AS `quantity`, 
    `l`.`created_at` AS `created_at`, 
    `l`.`remark` AS `log_remark` 
FROM `stock_logs` `l` 
JOIN `users` `u` ON (`l`.`user_id` = `u`.`id`)
JOIN `products` `p` ON (`l`.`product_id` = `p`.`id`)";

if ($condb->query($sql2)) {
    echo "- View 'v_stock_history' updated successfully.\n";
} else {
    echo "- Error updating v_stock_history: " . $condb->error . "\n";
}

$sql3 = "DROP VIEW IF EXISTS `v_inventory_location`";
$condb->query($sql3);

$sql4 = "CREATE VIEW `v_inventory_location` AS 
select 
    `p`.`id` AS `product_id`,
    `p`.`name` AS `part_name`,
    `p`.`qty` AS `current_qty`,
    `p`.`remark` AS `product_remark`,
    `sl`.`id` AS `slot_id`,
    `sl`.`slot_no` AS `slot_no`,
    `b`.`id` AS `box_id`,
    `b`.`box_code` AS `box_code`,
    `l`.`id` AS `level_id`,
    `l`.`level_no` AS `level_no`,
    `r`.`id` AS `rack_id`,
    `r`.`name` AS `rack_name`,
    (select min(`ir`.`ExpirationDate`) from `inventory_receive` `ir` where `ir`.`HanaPart` = `p`.`name` and `ir`.`QtyRemain` > 0) AS `earliest_expiration` 
from ((((`products` `p` join `slots` `sl` on(`p`.`slot_id` = `sl`.`id`)) join `boxes` `b` on(`sl`.`box_id` = `b`.`id`)) join `levels` `l` on(`b`.`level_id` = `l`.`id`)) join `racks` `r` on(`l`.`rack_id` = `r`.`id`))";

if ($condb->query($sql4)) {
    echo "- View 'v_inventory_location' updated successfully.\n";
} else {
    echo "- Error updating v_inventory_location: " . $condb->error . "\n";
}

echo "Done.\n";
