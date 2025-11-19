-- Migration: 002_ensure_contracts_softsave_columns.sql
-- Purpose: Ensure the contracts_softsave table has the expected columns used by the controller.
-- This is idempotent: it checks information_schema and adds missing columns only.

-- idempotent ALTER statements — will only add columns if they don't already exist
ALTER TABLE `contracts_softsave` ADD COLUMN IF NOT EXISTS `device_brand` VARCHAR(255) NULL;
ALTER TABLE `contracts_softsave` ADD COLUMN IF NOT EXISTS `device_model` VARCHAR(255) NULL;
ALTER TABLE `contracts_softsave` ADD COLUMN IF NOT EXISTS `device_name` VARCHAR(255) NULL;
ALTER TABLE `contracts_softsave` ADD COLUMN IF NOT EXISTS `imei` VARCHAR(64) NULL;
ALTER TABLE `contracts_softsave` ADD COLUMN IF NOT EXISTS `price` DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE `contracts_softsave` ADD COLUMN IF NOT EXISTS `payment_type` VARCHAR(50) NULL;
ALTER TABLE `contracts_softsave` ADD COLUMN IF NOT EXISTS `start_date` DATE NULL;
ALTER TABLE `contracts_softsave` ADD COLUMN IF NOT EXISTS `notes` TEXT NULL;
ALTER TABLE `contracts_softsave` ADD COLUMN IF NOT EXISTS `created_by` INT NULL;

-- end
