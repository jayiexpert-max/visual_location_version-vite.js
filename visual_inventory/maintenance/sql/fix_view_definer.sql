-- Fix MySQL error 1449: definer 'jayoverlay'@'172.31.71.69' does not exist
-- Run once on the server: mysql -u root -p visual_inventory_db < maintenance/sql/fix_view_definer.sql

USE visual_inventory_db;

DROP VIEW IF EXISTS `v_stock_history`;
CREATE VIEW `v_stock_history` AS
SELECT
    `l`.`id` AS `log_id`,
    `u`.`username` AS `username`,
    `u`.`role` AS `role`,
    `p`.`name` AS `part_name`,
    `l`.`action` AS `action`,
    substring_index(`l`.`action`, '|', 1) AS `action_type`,
    `l`.`quantity` AS `quantity`,
    `l`.`created_at` AS `created_at`,
    `l`.`remark` AS `log_remark`
FROM `stock_logs` `l`
JOIN `users` `u` ON (`l`.`user_id` = `u`.`id`)
JOIN `products` `p` ON (`l`.`product_id` = `p`.`id`);

DROP VIEW IF EXISTS `v_inventory_location`;
CREATE VIEW `v_inventory_location` AS
SELECT
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
    (
        SELECT min(`ir`.`ExpirationDate`)
        FROM `inventory_receive` `ir`
        WHERE `ir`.`HanaPart` = `p`.`name` AND `ir`.`QtyRemain` > 0
    ) AS `earliest_expiration`
FROM `products` `p`
JOIN `slots` `sl` ON (`p`.`slot_id` = `sl`.`id`)
JOIN `boxes` `b` ON (`sl`.`box_id` = `b`.`id`)
JOIN `levels` `l` ON (`b`.`level_id` = `l`.`id`)
JOIN `racks` `r` ON (`l`.`rack_id` = `r`.`id`);
