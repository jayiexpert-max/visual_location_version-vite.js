-- Visual Location — Phase 1 additive migrations
-- Apply AFTER importing visual_inventory_db.sql from PHP project
-- MariaDB 10.4+ / MySQL 8.0+

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- ---------------------------------------------------------------------------
-- 1. User language preference (replaces PHP session-only lang)
-- ---------------------------------------------------------------------------
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `lang` ENUM('th', 'en') NOT NULL DEFAULT 'th'
    COMMENT 'UI language preference'
    AFTER `role`;

-- ---------------------------------------------------------------------------
-- 2. JWT refresh tokens
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3. TV highlights (replaces data/tv_highlight.json file)
-- ---------------------------------------------------------------------------
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
  COMMENT='Active TV/3D highlight state (single active row enforced in app)';

-- ---------------------------------------------------------------------------
-- 4. MQTT IO command audit log
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 5. CPK PublicUID token cache (replaces PHP session cache)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cpk_token_cache` (
  `id` INT NOT NULL DEFAULT 1,
  `public_uid` VARCHAR(64) NOT NULL,
  `expired_at` DATETIME NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Singleton cache for CPK PublicUID token';
