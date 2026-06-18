-- Migration 007: Add NestJS "manage" role to users.role enum (system admin)
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('admin', 'manage', 'user', 'material_prep') NOT NULL DEFAULT 'user';
