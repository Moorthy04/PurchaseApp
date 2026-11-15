-- ========================================================
-- Item & Purchase Management System
-- MySQL Database Schema
-- Database: item_purchase_db
-- ========================================================

CREATE DATABASE IF NOT EXISTS `item_purchase_db` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `item_purchase_db`;

-- --------------------------------------------------------
-- 1. Table: item_types
-- Stores Item Type categories (e.g. Electronics, Furniture)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `purchase_items`;
DROP TABLE IF EXISTS `items`;
DROP TABLE IF EXISTS `purchases`;
DROP TABLE IF EXISTS `item_types`;

CREATE TABLE `item_types` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `type_name` VARCHAR(100) NOT NULL UNIQUE,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table: items
-- Stores Item Master information and current stock balance
-- --------------------------------------------------------
CREATE TABLE `items` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL,
    `purchase_date` DATE NOT NULL,
    `stock_available` INT NOT NULL DEFAULT 0,
    `item_type_id` BIGINT NOT NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT `fk_items_item_type` FOREIGN KEY (`item_type_id`) REFERENCES `item_types` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_item_stock_non_negative` CHECK (`stock_available` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_items_item_type_id` ON `items` (`item_type_id`);
CREATE INDEX `idx_items_active` ON `items` (`active`);
CREATE INDEX `idx_items_name` ON `items` (`name`);

-- --------------------------------------------------------
-- 3. Table: purchases
-- Stores Purchase/Order header information
-- Historical transaction: Deletion is strictly prohibited
-- --------------------------------------------------------
CREATE TABLE `purchases` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `order_id` VARCHAR(50) NOT NULL UNIQUE,
    `purchase_date` DATE NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_purchases_order_id` ON `purchases` (`order_id`);
CREATE INDEX `idx_purchases_purchase_date` ON `purchases` (`purchase_date`);

-- --------------------------------------------------------
-- 4. Table: purchase_items
-- Stores Items and quantities belonging to each Purchase
-- --------------------------------------------------------
CREATE TABLE `purchase_items` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `purchase_id` BIGINT NOT NULL,
    `item_id` BIGINT NOT NULL,
    `quantity` INT UNSIGNED NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `fk_purchase_items_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_purchase_items_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_purchase_item_quantity_positive` CHECK (`quantity` > 0),
    CONSTRAINT `uq_purchase_item_per_order` UNIQUE (`purchase_id`, `item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_purchase_items_purchase_id` ON `purchase_items` (`purchase_id`);
CREATE INDEX `idx_purchase_items_item_id` ON `purchase_items` (`item_id`);

-- ========================================================
-- MANDATORY SQL JOIN DEMONSTRATION QUERIES
-- ========================================================

-- Query 1: Item + Item Type
-- Demonstrates JOIN between items and item_types
SELECT 
    i.id, 
    i.name, 
    it.type_name, 
    i.purchase_date, 
    i.stock_available, 
    i.active 
FROM items i 
JOIN item_types it ON i.item_type_id = it.id;

-- Query 2: Purchase + Purchase Items + Items + Item Types
-- Demonstrates 4-table relational JOIN retrieving full purchase details
SELECT 
    p.order_id, 
    p.purchase_date, 
    i.id AS item_id, 
    i.name AS item_name, 
    it.type_name, 
    pi.quantity 
FROM purchases p 
JOIN purchase_items pi ON p.id = pi.purchase_id 
JOIN items i ON pi.item_id = i.id 
JOIN item_types it ON i.item_type_id = it.id 
WHERE p.order_id = 'PO-00001';
