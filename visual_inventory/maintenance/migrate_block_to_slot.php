<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require __DIR__ . '/../config/condb.php';

echo "Starting migration: Block to Slot...\n";

// 1. Rename table blocks to slots
$sql1 = "RENAME TABLE blocks TO slots";
if ($condb->query($sql1)) {
    echo "- Table 'blocks' renamed to 'slots' successfully.\n";
} else {
    echo "- Error renaming table: " . $condb->error . "\n";
}

// 2. Rename column block_no to slot_no in slots table
$sql2 = "ALTER TABLE slots CHANGE block_no slot_no INT(11)";
if ($condb->query($sql2)) {
    echo "- Column 'block_no' in 'slots' renamed to 'slot_no' successfully.\n";
} else {
    echo "- Error renaming column block_no: " . $condb->error . "\n";
}

// 3. Rename column block_id to slot_id in products table
$sql3 = "ALTER TABLE products CHANGE block_id slot_id INT(11)";
if ($condb->query($sql3)) {
    echo "- Column 'block_id' in 'products' renamed to 'slot_id' successfully.\n";
} else {
    echo "- Error renaming column block_id: " . $condb->error . "\n";
}

// 4. Update View v_inventory_location
$dropView = "DROP VIEW IF EXISTS v_inventory_location";
$condb->query($dropView);

$createView = "CREATE VIEW `v_inventory_location` AS 
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

if ($condb->query($createView)) {
    echo "- View 'v_inventory_location' updated successfully.\n";
} else {
    echo "- Error updating view: " . $condb->error . "\n";
}

echo "Migration completed.\n";
