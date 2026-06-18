-- Clear all test PUID receive/issue data (keeps layout: racks, slots, products mapping).
-- Run: mysql -u root -p visual_inventory_db < maintenance/sql/clear_puid_test_data.sql

USE visual_inventory_db;

SET SESSION sql_safe_updates = 0;

DELETE FROM stock_logs;
DELETE FROM reservation_list;
DELETE FROM inventory_receive;
UPDATE products SET qty = 0;

ALTER TABLE inventory_receive AUTO_INCREMENT = 1;
ALTER TABLE stock_logs AUTO_INCREMENT = 1;
ALTER TABLE reservation_list AUTO_INCREMENT = 1;
