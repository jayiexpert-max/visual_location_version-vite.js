-- Migration 006: Add is_active column to users table
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=active, 0=inactive' AFTER `remark`;
