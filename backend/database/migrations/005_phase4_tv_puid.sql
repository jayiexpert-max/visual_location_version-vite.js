-- Phase 4 parity: PUID on TV highlights (warehouse_highlight_service.php)
-- MariaDB 10.4+ / MySQL 8.0+

SET NAMES utf8mb4;
SET time_zone = '+07:00';

ALTER TABLE `tv_highlights`
  ADD COLUMN IF NOT EXISTS `puid` VARCHAR(64) DEFAULT NULL COMMENT 'Highlighted PUID when search by reel' AFTER `product_name`;
