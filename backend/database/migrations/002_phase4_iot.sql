-- Visual Location — Phase 4 IoT integration
-- Apply after 001_additive_phase1.sql
-- MariaDB 10.4+ / MySQL 8.0+

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- ---------------------------------------------------------------------------
-- 1. Raspberry Pi device registry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `raspberry_devices` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `device_id` INT NOT NULL COMMENT 'Logical IO device ID (matches ethernet_ios.id)',
  `ethernet_io_id` INT DEFAULT NULL COMMENT 'FK -> ethernet_ios.id',
  `hostname` VARCHAR(100) DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `mac_address` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('online', 'offline', 'unknown') NOT NULL DEFAULT 'unknown',
  `last_heartbeat_at` DATETIME DEFAULT NULL,
  `output_count` INT NOT NULL DEFAULT 16,
  `firmware_version` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_raspberry_device_id` (`device_id`),
  KEY `idx_raspberry_status` (`status`),
  KEY `idx_raspberry_heartbeat` (`last_heartbeat_at`),
  CONSTRAINT `fk_raspberry_ethernet_io`
    FOREIGN KEY (`ethernet_io_id`) REFERENCES `ethernet_ios` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Raspberry Pi MQTT gateway registry';

-- ---------------------------------------------------------------------------
-- 2. MQTT message audit log (inbound + outbound)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mqtt_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `direction` ENUM('inbound', 'outbound') NOT NULL,
  `topic` VARCHAR(255) NOT NULL,
  `payload_json` JSON NOT NULL,
  `qos` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `device_id` INT DEFAULT NULL,
  `status` ENUM('received', 'published', 'failed') NOT NULL,
  `error_message` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mqtt_log_created` (`created_at`),
  KEY `idx_mqtt_log_topic` (`topic`),
  KEY `idx_mqtt_log_device` (`device_id`),
  KEY `idx_mqtt_log_direction` (`direction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='MQTT message audit trail';
