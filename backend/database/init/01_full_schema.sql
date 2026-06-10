-- Visual Location — Full MySQL Schema (schema only, no seed data)
-- Database: visual_inventory_db
-- Engine: InnoDB | Charset: utf8mb4 | Timezone: +07:00
-- Includes: baseline PHP tables + indexes + views + Phase 1 additive tables

SET NAMES utf8mb4;
SET time_zone = '+07:00';
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `visual_inventory_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `visual_inventory_db`;

CREATE TABLE `ai_query_cache` (
  `id` int(11) NOT NULL,
  `question_hash` char(64) NOT NULL,
  `original_question` text NOT NULL,
  `generated_sql` text NOT NULL,
  `hit_count` int(11) DEFAULT 1,
  `last_hit` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `bom_items` (
  `id` int(11) NOT NULL COMMENT 'รหัสรายการ BOM (PK)',
  `revision_id` int(11) NOT NULL COMMENT 'รหัสเวอร์ชัน (FK -> model_revisions)',
  `material_id` int(11) NOT NULL COMMENT 'รหัสวัสดุ (FK -> materials)',
  `qty` decimal(12,4) NOT NULL DEFAULT 0.0000 COMMENT 'จำนวนวัสดุที่ต้องใช้ต่อ 1 ชิ้นงาน',
  `item_list` varchar(255) NOT NULL,
  `unit` varchar(50) NOT NULL DEFAULT 'PC',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น วัสดุทดแทน, หมายเหตุพิเศษ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รายการวัตถุดิบ (BOM) - ข้อมูลวัสดุที่ต้องใช้ในแต่ละรุ่นงาน';
CREATE TABLE `boxes` (
  `id` int(11) NOT NULL COMMENT 'รหัสกล่อง (PK)',
  `level_id` int(11) DEFAULT NULL COMMENT 'รหัสชั้นที่อยู่ (FK -> levels)',
  `box_code` varchar(50) DEFAULT NULL COMMENT 'รหัสกล่อง เช่น A1, B2',
  `position_in_level` int(11) DEFAULT NULL COMMENT 'ลำดับตำแหน่งบนชั้น',
  `layout` varchar(10) DEFAULT '1x1' COMMENT 'รูปแบบการแบ่งช่อง เช่น 1x1, 2x2',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ',
  `io_device_id` int(11) DEFAULT NULL,
  `io_output_pin` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='กล่องเก็บของ (Box) - กล่องที่อยู่บนชั้นวาง';
CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL COMMENT 'รหัสข้อความ (PK)',
  `sender` varchar(255) NOT NULL COMMENT 'ชื่อผู้ส่ง',
  `receiver` varchar(255) NOT NULL COMMENT 'ชื่อผู้รับ',
  `message` text NOT NULL COMMENT 'เนื้อหาข้อความ',
  `timestamp` datetime DEFAULT current_timestamp() COMMENT 'วันเวลาที่ส่ง',
  `is_read` tinyint(1) DEFAULT 0 COMMENT 'อ่านแล้วหรือยัง (0=ยังไม่อ่าน, 1=อ่านแล้ว)',
  `msg_type` varchar(50) DEFAULT 'text' COMMENT 'ประเภทข้อความ เช่น text, image',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ข้อความแชท - ประวัติการสนทนาในระบบ';
CREATE TABLE `chat_users` (
  `id` int(11) NOT NULL COMMENT 'รหัสผู้ใช้แชท (PK)',
  `username` varchar(255) NOT NULL COMMENT 'ชื่อผู้ใช้',
  `last_active` datetime DEFAULT current_timestamp() COMMENT 'เวลาที่ออนไลน์ล่าสุด',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ผู้ใช้แชท - ข้อมูลผู้ใช้ระบบแชทภายใน';
CREATE TABLE `ethernet_ios` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `ip_address` varchar(50) NOT NULL,
  `port` int(11) DEFAULT 80,
  `controller_type` varchar(50) DEFAULT 'http',
  `url_format` varchar(255) DEFAULT 'http://{IP}:{PORT}/relay.cgi?relay={PIN}&state={STATE}',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `inputs` int(11) DEFAULT 16,
  `outputs` int(11) DEFAULT 16
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `inventory_receive` (
  `id` int(11) NOT NULL COMMENT 'รหัสการรับสินค้า (PK)',
  `ReceiveDate` datetime DEFAULT NULL COMMENT 'วันที่รับสินค้าเข้าคลัง',
  `PUID` varchar(50) DEFAULT NULL COMMENT 'รหัสเฉพาะของสินค้า (Unique ID)',
  `ReservationNo` varchar(50) DEFAULT NULL,
  `IM` varchar(50) DEFAULT NULL COMMENT 'เลขที่ใบรับวัสดุ (Incoming Material)',
  `Customer` varchar(50) DEFAULT NULL COMMENT 'ชื่อลูกค้า/ผู้ส่ง',
  `HanaPart` varchar(50) DEFAULT NULL COMMENT 'รหัสพาร์ท Hana (ตรงกับ material_code)',
  `Description` varchar(255) DEFAULT NULL COMMENT 'รายละเอียดสินค้า',
  `MnfPartNo` varchar(100) DEFAULT NULL COMMENT 'รหัสพาร์ทของผู้ผลิต',
  `LotNo` varchar(100) DEFAULT NULL COMMENT 'หมายเลขล็อต',
  `DateCode` varchar(50) DEFAULT NULL COMMENT 'รหัสวันผลิต',
  `BinSize` varchar(50) DEFAULT NULL COMMENT 'ขนาดถาด/กล่องบรรจุ',
  `Qty` int(11) DEFAULT NULL COMMENT 'จำนวนที่รับเข้ามา',
  `QtyRemain` int(11) DEFAULT NULL COMMENT 'จำนวนคงเหลือปัจจุบัน',
  `McID` int(11) DEFAULT NULL COMMENT 'รหัสเครื่องจักร',
  `MachineName` varchar(255) DEFAULT NULL COMMENT 'ชื่อเครื่องจักร/สถานที่ใช้งาน',
  `StatusName` varchar(50) DEFAULT NULL COMMENT 'สถานะสินค้า เช่น Available, Restricted',
  `ExpirationDate` datetime DEFAULT NULL COMMENT 'วันหมดอายุ',
  `OldIM` varchar(50) DEFAULT NULL COMMENT 'เลขที่ IM เก่า (กรณีโอนย้าย)',
  `Remark` varchar(255) DEFAULT NULL COMMENT 'หมายเหตุ เช่น งานด่วน, รอตรวจสอบ',
  `Loc_Shelf` varchar(50) DEFAULT NULL COMMENT 'ตำแหน่ง: หมายเลขตู้/ชั้นวาง',
  `Loc_Level` varchar(50) DEFAULT NULL COMMENT 'ตำแหน่ง: หมายเลขชั้น',
  `Loc_Box` varchar(50) DEFAULT NULL COMMENT 'ตำแหน่ง: หมายเลขกล่อง',
  `ExpireDate_RoomTemp` datetime DEFAULT NULL COMMENT 'วันหมดอายุ (อุณหภูมิห้อง)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่สร้างข้อมูล',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'วันเวลาที่แก้ไขล่าสุด'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รับสินค้าเข้าคลัง - ข้อมูลการรับวัสดุเข้าสต็อก รวมวันหมดอายุ';
CREATE TABLE `levels` (
  `id` int(11) NOT NULL COMMENT 'รหัสชั้น (PK)',
  `rack_id` int(11) DEFAULT NULL COMMENT 'รหัสตู้ที่อยู่ (FK -> racks)',
  `level_no` int(11) DEFAULT NULL COMMENT 'หมายเลขชั้น (1=ล่างสุด)',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ชั้นวาง (Level) - ชั้นแต่ละชั้นบนตู้/ชั้นวาง';
CREATE TABLE `materials` (
  `id` int(11) NOT NULL COMMENT 'รหัสวัสดุ (PK)',
  `material_code` varchar(50) NOT NULL COMMENT 'รหัสวัสดุ (ตรงกับ HanaPart)',
  `description` varchar(255) DEFAULT NULL COMMENT 'รายละเอียดวัสดุ',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น สินค้าทดแทน, เลิกใช้แล้ว'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รายชื่อวัสดุ (Material Master) - ข้อมูลหลักของวัสดุทั้งหมด';
CREATE TABLE `models` (
  `id` int(11) NOT NULL COMMENT 'รหัสรุ่นงาน (PK)',
  `model_code` varchar(50) NOT NULL COMMENT 'รหัสรุ่น เช่น MODEL-A001',
  `description` varchar(255) DEFAULT NULL COMMENT 'รายละเอียดรุ่นงาน',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่สร้าง',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น ลูกค้าเจ้าของรุ่น'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รุ่นงาน/ผลิตภัณฑ์ (Model) - ข้อมูลรุ่นผลิตภัณฑ์';
CREATE TABLE `model_revisions` (
  `id` int(11) NOT NULL COMMENT 'รหัสเวอร์ชัน (PK)',
  `model_id` int(11) NOT NULL COMMENT 'รหัสรุ่นงาน (FK -> models)',
  `revision` char(2) NOT NULL COMMENT 'เลขเวอร์ชัน เช่น 01, 02',
  `status` enum('DRAFT','ACTIVE','OBSOLETE') DEFAULT 'DRAFT' COMMENT 'สถานะ: DRAFT=ร่าง, ACTIVE=ใช้งาน, OBSOLETE=ยกเลิก',
  `remark` varchar(255) DEFAULT NULL COMMENT 'หมายเหตุ เช่น เหตุผลในการแก้ไข',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่สร้าง'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='เวอร์ชันรุ่นงาน (Revision) - เวอร์ชันของแต่ละรุ่นผลิตภัณฑ์';
CREATE TABLE `production_lines` (
  `id` int(11) NOT NULL,
  `line_name` varchar(100) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `production_orders` (
  `id` int(11) NOT NULL COMMENT 'รหัสใบสั่งผลิต (PK)',
  `order_no` varchar(20) DEFAULT NULL COMMENT 'เลขที่ใบสั่งผลิต',
  `user_id` int(11) NOT NULL COMMENT 'รหัสผู้สร้างใบสั่ง (FK -> users)',
  `status` enum('pending','preparing','completed','cancelled') DEFAULT 'pending' COMMENT 'สถานะ: pending=รอ, preparing=กำลังเตรียม, completed=เสร็จ, cancelled=ยกเลิก',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น เหตุผลการยกเลิก',
  `created_at` datetime DEFAULT current_timestamp() COMMENT 'วันเวลาที่สร้างใบสั่ง',
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'วันเวลาที่แก้ไขล่าสุด'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ใบสั่งผลิต (Production Order) - คำสั่งเบิกวัสดุเพื่อผลิต';
CREATE TABLE `production_order_items` (
  `id` int(11) NOT NULL COMMENT 'รหัสรายการ (PK)',
  `order_id` int(11) NOT NULL COMMENT 'รหัสใบสั่งผลิต (FK -> production_orders)',
  `material_id` int(11) NOT NULL COMMENT 'รหัสวัสดุ (FK -> materials)',
  `target_qty` int(11) NOT NULL COMMENT 'จำนวนเป้าหมายที่ต้องเบิก',
  `picked_qty` int(11) DEFAULT 0 COMMENT 'จำนวนที่เบิกไปแล้ว',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น เบิกไม่ครบ, รอของ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รายการในใบสั่งผลิต - วัสดุที่ต้องเบิกตามใบสั่งผลิต';
CREATE TABLE `production_reservations` (
  `id` int(11) NOT NULL COMMENT 'รหัสการจอง (PK)',
  `user_id` int(11) NOT NULL COMMENT 'รหัสผู้จอง (FK -> users)',
  `model_id` int(11) NOT NULL COMMENT 'รหัสรุ่นงาน (FK -> models)',
  `revision_id` int(11) NOT NULL COMMENT 'รหัสเวอร์ชัน (FK -> model_revisions)',
  `production_qty` int(11) NOT NULL COMMENT 'จำนวนที่จะผลิต',
  `status` enum('active','cancelled','completed') DEFAULT 'active' COMMENT 'สถานะ: active=กำลังจอง, cancelled=ยกเลิก, completed=เสร็จ',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่จอง',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น เหตุผลการจอง'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='การจองวัสดุ (Reservation) - จองวัสดุสำหรับการผลิต';
CREATE TABLE `products` (
  `id` int(11) NOT NULL COMMENT 'รหัสสินค้า (PK)',
  `slot_id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL COMMENT 'รหัสพาร์ท (ตรงกับ HanaPart / material_code)',
  `qty` int(11) DEFAULT 0 COMMENT 'จำนวนคงเหลือในช่องนี้',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น ของชำรุด, ต้องตรวจสอบ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='สินค้า/วัสดุในตำแหน่ง (Product) - ข้อมูลวัสดุที่เก็บอยู่ในแต่ละช่อง';
CREATE TABLE `racks` (
  `id` int(11) NOT NULL COMMENT 'รหัสตู้/ชั้นวาง (PK)',
  `name` varchar(50) DEFAULT NULL COMMENT 'ชื่อตู้ เช่น Rack-A, Rack-B',
  `location_desc` varchar(255) DEFAULT NULL COMMENT 'คำอธิบายตำแหน่งตู้ เช่น โซน A ฝั่งซ้าย',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น ตู้เก่า, ย้ายตำแหน่ง',
  `io_device_id` int(11) DEFAULT NULL,
  `io_red_pin` int(11) DEFAULT NULL,
  `io_yellow_pin` int(11) DEFAULT NULL,
  `io_green_pin` int(11) DEFAULT NULL,
  `io_buzzer_pin` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ตู้/ชั้นวาง (Rack) - ตู้เก็บของหลัก';
CREATE TABLE `reservation_list` (
  `id` int(11) NOT NULL,
  `res_no` varchar(50) DEFAULT NULL,
  `req_date` datetime DEFAULT NULL,
  `store` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `last_update` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `slots` (
  `id` int(11) NOT NULL COMMENT 'รหัสช่อง (PK)',
  `box_id` int(11) DEFAULT NULL COMMENT 'รหัสกล่องที่อยู่ (FK -> boxes)',
  `slot_no` int(11) DEFAULT NULL,
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ช่องเก็บของในกล่อง (Block) - แบ่งพื้นที่ย่อยภายในกล่อง';
CREATE TABLE `stock_logs` (
  `id` int(11) NOT NULL COMMENT 'รหัสบันทึก (PK)',
  `product_id` int(11) NOT NULL COMMENT 'รหัสสินค้า (FK -> products)',
  `user_id` int(11) NOT NULL COMMENT 'รหัสผู้ดำเนินการ (FK -> users)',
  `action` varchar(255) NOT NULL COMMENT 'การกระทำ เช่น add|จำนวน|PUID หรือ pick_stock',
  `quantity` int(11) NOT NULL COMMENT 'จำนวนที่เพิ่ม/หยิบ',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่ดำเนินการ',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น เหตุผลการเบิก, หมายเลขใบเบิก'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ประวัติเคลื่อนไหวสต็อก (Log) - บันทึกการเพิ่ม/หยิบสินค้า';
CREATE TABLE `users` (
  `id` int(11) NOT NULL COMMENT 'รหัสผู้ใช้ (PK)',
  `username` varchar(100) NOT NULL COMMENT 'ชื่อผู้ใช้งาน (Login)',
  `password` varchar(255) NOT NULL COMMENT 'รหัสผ่าน (เข้ารหัสแล้ว)',
  `role` enum('admin','user','material_prep') DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่สร้างบัญชี',
  `email` varchar(255) DEFAULT NULL COMMENT 'อีเมล',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น แผนก, ตำแหน่ง'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ผู้ใช้งานระบบ (User) - ข้อมูลผู้ใช้งานทั้งหมด';

ALTER TABLE `ai_query_cache`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `question_hash` (`question_hash`),
  ADD KEY `question_hash_2` (`question_hash`);
ALTER TABLE `bom_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `revision_id` (`revision_id`,`material_id`),
  ADD KEY `material_id` (`material_id`);
ALTER TABLE `bom_items` ADD FULLTEXT KEY `idx_ft_bom_remark` (`remark`);
ALTER TABLE `boxes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `level_id` (`level_id`);
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`);
ALTER TABLE `chat_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);
ALTER TABLE `ethernet_ios`
  ADD PRIMARY KEY (`id`);
ALTER TABLE `inventory_receive`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `PUID` (`PUID`);
ALTER TABLE `inventory_receive` ADD FULLTEXT KEY `idx_ft_inv_remark` (`Remark`);
ALTER TABLE `inventory_receive` ADD FULLTEXT KEY `idx_ft_inv_desc` (`Description`);
ALTER TABLE `inventory_receive` ADD FULLTEXT KEY `idx_ft_inv_hanapart` (`HanaPart`);
ALTER TABLE `levels`
  ADD PRIMARY KEY (`id`),
  ADD KEY `rack_id` (`rack_id`);
ALTER TABLE `materials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `material_code` (`material_code`);
ALTER TABLE `materials` ADD FULLTEXT KEY `idx_ft_mat_remark` (`remark`);
ALTER TABLE `materials` ADD FULLTEXT KEY `idx_ft_mat_desc` (`description`);
ALTER TABLE `models`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `model_code` (`model_code`);
ALTER TABLE `models` ADD FULLTEXT KEY `idx_ft_model_remark` (`remark`);
ALTER TABLE `model_revisions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `model_id` (`model_id`,`revision`);
ALTER TABLE `production_lines`
  ADD PRIMARY KEY (`id`);
ALTER TABLE `production_orders`
  ADD PRIMARY KEY (`id`);
ALTER TABLE `production_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);
ALTER TABLE `production_reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `status` (`status`),
  ADD KEY `revision_id` (`revision_id`);
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `block_id` (`slot_id`);
ALTER TABLE `products` ADD FULLTEXT KEY `idx_ft_prod_remark` (`remark`);
ALTER TABLE `products` ADD FULLTEXT KEY `idx_ft_prod_name` (`name`);
ALTER TABLE `racks`
  ADD PRIMARY KEY (`id`);
ALTER TABLE `reservation_list`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `res_no` (`res_no`);
ALTER TABLE `slots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_blocks_box` (`box_id`);
ALTER TABLE `stock_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `stock_logs_ibfk_1` (`product_id`);
ALTER TABLE `stock_logs` ADD FULLTEXT KEY `idx_ft_log_remark` (`remark`);
ALTER TABLE `stock_logs` ADD FULLTEXT KEY `idx_ft_log_action` (`action`);
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);
ALTER TABLE `ai_query_cache`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `bom_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสรายการ BOM (PK)', AUTO_INCREMENT=601;
ALTER TABLE `boxes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสกล่อง (PK)', AUTO_INCREMENT=63;
ALTER TABLE `chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสข้อความ (PK)';
ALTER TABLE `chat_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสผู้ใช้แชท (PK)';
ALTER TABLE `ethernet_ios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `inventory_receive`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสการรับสินค้า (PK)', AUTO_INCREMENT=25;
ALTER TABLE `levels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสชั้น (PK)', AUTO_INCREMENT=24;
ALTER TABLE `materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสวัสดุ (PK)', AUTO_INCREMENT=319;
ALTER TABLE `models`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสรุ่นงาน (PK)', AUTO_INCREMENT=22;
ALTER TABLE `model_revisions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสเวอร์ชัน (PK)', AUTO_INCREMENT=28;
ALTER TABLE `production_lines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;
ALTER TABLE `production_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสใบสั่งผลิต (PK)', AUTO_INCREMENT=7;
ALTER TABLE `production_order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสรายการ (PK)', AUTO_INCREMENT=26;
ALTER TABLE `production_reservations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสการจอง (PK)';
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสสินค้า (PK)', AUTO_INCREMENT=174;
ALTER TABLE `racks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสตู้/ชั้นวาง (PK)', AUTO_INCREMENT=8;
ALTER TABLE `reservation_list`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=141;
ALTER TABLE `slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสช่อง (PK)', AUTO_INCREMENT=208;
ALTER TABLE `stock_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสบันทึก (PK)', AUTO_INCREMENT=34;
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสผู้ใช้ (PK)', AUTO_INCREMENT=8;
ALTER TABLE `bom_items`
  ADD CONSTRAINT `bom_items_ibfk_1` FOREIGN KEY (`revision_id`) REFERENCES `model_revisions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bom_items_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE CASCADE;
ALTER TABLE `boxes`
  ADD CONSTRAINT `boxes_ibfk_1` FOREIGN KEY (`level_id`) REFERENCES `levels` (`id`);
ALTER TABLE `levels`
  ADD CONSTRAINT `levels_ibfk_1` FOREIGN KEY (`rack_id`) REFERENCES `racks` (`id`);
ALTER TABLE `model_revisions`
  ADD CONSTRAINT `model_revisions_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE;
ALTER TABLE `production_order_items`
  ADD CONSTRAINT `production_order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE;
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`slot_id`) REFERENCES `slots` (`id`);
ALTER TABLE `slots`
  ADD CONSTRAINT `fk_blocks_box` FOREIGN KEY (`box_id`) REFERENCES `boxes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `slots_ibfk_1` FOREIGN KEY (`box_id`) REFERENCES `boxes` (`id`);
ALTER TABLE `stock_logs`
  ADD CONSTRAINT `stock_logs_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `stock_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_inventory_location`  AS SELECT `p`.`id` AS `product_id`, `p`.`name` AS `part_name`, `p`.`qty` AS `current_qty`, `p`.`remark` AS `product_remark`, `sl`.`id` AS `slot_id`, `sl`.`slot_no` AS `slot_no`, `b`.`id` AS `box_id`, `b`.`box_code` AS `box_code`, `l`.`id` AS `level_id`, `l`.`level_no` AS `level_no`, `r`.`id` AS `rack_id`, `r`.`name` AS `rack_name`, (select min(`ir`.`ExpirationDate`) from `inventory_receive` `ir` where `ir`.`HanaPart` = `p`.`name` and `ir`.`QtyRemain` > 0) AS `earliest_expiration` FROM ((((`products` `p` join `slots` `sl` on(`p`.`slot_id` = `sl`.`id`)) join `boxes` `b` on(`sl`.`box_id` = `b`.`id`)) join `levels` `l` on(`b`.`level_id` = `l`.`id`)) join `racks` `r` on(`l`.`rack_id` = `r`.`id`)) ;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_stock_history`  AS SELECT `l`.`id` AS `log_id`, `u`.`username` AS `username`, `u`.`role` AS `role`, `p`.`name` AS `part_name`, `l`.`action` AS `action`, substring_index(`l`.`action`,'|',1) AS `action_type`, `l`.`quantity` AS `quantity`, `l`.`created_at` AS `created_at`, `l`.`remark` AS `log_remark` FROM ((`stock_logs` `l` join `users` `u` on(`l`.`user_id` = `u`.`id`)) join `products` `p` on(`l`.`product_id` = `p`.`id`)) ;


-- ---------------------------------------------------------------------------
-- Phase 1 additive (NestJS)
-- ---------------------------------------------------------------------------

ALTER TABLE `users`
  ADD COLUMN `lang` ENUM('th', 'en') NOT NULL DEFAULT 'th'
    COMMENT 'UI language preference'
    AFTER `role`;

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT 'FK -> users.id',
  `token_hash` CHAR(64) NOT NULL COMMENT 'SHA-256 of refresh token',
  `device_type` ENUM('desktop', 'handheld', 'tv') NOT NULL DEFAULT 'desktop',
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refresh_token_hash` (`token_hash`),
  KEY `idx_refresh_user_id` (`user_id`),
  KEY `idx_refresh_expires` (`expires_at`),
  CONSTRAINT `fk_refresh_tokens_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='JWT refresh token store';

CREATE TABLE IF NOT EXISTS `tv_highlights` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_name` VARCHAR(255) DEFAULT NULL,
  `box_id` INT NOT NULL,
  `slot_id` INT DEFAULT NULL,
  `slot_no` INT DEFAULT NULL,
  `rack_name` VARCHAR(50) DEFAULT NULL,
  `level_no` INT DEFAULT NULL,
  `box_code` VARCHAR(50) DEFAULT NULL,
  `qty` INT NOT NULL DEFAULT 0,
  `searched_by` VARCHAR(100) DEFAULT NULL,
  `highlight_seq` VARCHAR(64) NOT NULL,
  `action_type` VARCHAR(32) NOT NULL DEFAULT 'highlight',
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tv_highlight_seq` (`highlight_seq`),
  KEY `idx_tv_highlight_expires` (`expires_at`),
  KEY `idx_tv_highlight_box` (`box_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Active TV/3D highlight state';

CREATE TABLE IF NOT EXISTS `io_command_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT DEFAULT NULL COMMENT 'FK -> users.id (null for system)',
  `device_id` INT DEFAULT NULL COMMENT 'FK -> ethernet_ios.id',
  `action` ENUM('highlight', 'off', 'reset') NOT NULL,
  `mqtt_topic` VARCHAR(255) NOT NULL,
  `payload_json` JSON NOT NULL,
  `box_id` INT DEFAULT NULL,
  `slot_no` INT DEFAULT NULL,
  `status` ENUM('published', 'failed') NOT NULL DEFAULT 'published',
  `error_message` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_io_log_created` (`created_at`),
  KEY `idx_io_log_device` (`device_id`),
  KEY `idx_io_log_box` (`box_id`),
  CONSTRAINT `fk_io_log_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_io_log_device`
    FOREIGN KEY (`device_id`) REFERENCES `ethernet_ios` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit trail for MQTT IO commands';

CREATE TABLE IF NOT EXISTS `cpk_token_cache` (
  `id` INT NOT NULL DEFAULT 1,
  `public_uid` VARCHAR(64) NOT NULL,
  `expired_at` DATETIME NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Singleton cache for CPK PublicUID token';

SET FOREIGN_KEY_CHECKS = 1;
