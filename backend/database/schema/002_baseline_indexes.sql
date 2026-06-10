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
