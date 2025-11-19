-- Migration: 001_add_customer_id_to_contracts_softsave.sql
-- Purpose: add a nullable customer_id column to contracts_softsave so that
-- the contracts controller in this repo (and production) can reference customer records.
-- This migration is idempotent: it checks for the column and only alters if missing.

-- Simple idempotent migration: add customer_id column if missing
ALTER TABLE `contracts_softsave` ADD COLUMN IF NOT EXISTS `customer_id` INT NULL;

-- optional index (commented out because some MySQL versions reject IF NOT EXISTS for indexes)
-- ALTER TABLE `contracts_softsave` ADD INDEX (`customer_id`);

-- end
