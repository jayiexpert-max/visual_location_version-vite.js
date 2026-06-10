-- Visual Location — Phase 6 production hardening
-- Apply after 002_phase4_iot.sql

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- ---------------------------------------------------------------------------
-- 1. Account lockout fields on users
-- ---------------------------------------------------------------------------
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `failed_login_attempts` INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'Consecutive failed login count' AFTER `remark`,
  ADD COLUMN IF NOT EXISTS `locked_until` DATETIME DEFAULT NULL
    COMMENT 'Account locked until this time (NULL = not locked)' AFTER `failed_login_attempts`;

-- ---------------------------------------------------------------------------
-- 2. Security / operations audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT DEFAULT NULL COMMENT 'FK -> users.id',
  `username` VARCHAR(100) DEFAULT NULL,
  `action` VARCHAR(64) NOT NULL,
  `category` ENUM(
    'auth',
    'inventory',
    'user',
    'system',
    'mqtt',
    'io',
    'report',
    'warehouse'
  ) NOT NULL DEFAULT 'system',
  `resource_type` VARCHAR(64) DEFAULT NULL,
  `resource_id` VARCHAR(64) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `details_json` JSON DEFAULT NULL,
  `status` ENUM('success', 'failure') NOT NULL DEFAULT 'success',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_created` (`created_at`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_category` (`category`),
  CONSTRAINT `fk_audit_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Security and operations audit trail';
