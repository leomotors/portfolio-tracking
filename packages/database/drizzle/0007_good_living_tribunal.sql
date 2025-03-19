CREATE TYPE "public"."asset_class" AS ENUM('cash', 'bond', 'stock', 'gold', 'digital_asset');--> statement-breakpoint
-- CREATE TYPE "public"."investment_type" AS ENUM('mutual_fund', 'thai_stock', 'offshore_stock_dr', 'us_stock', 'us_stock_drx', 'gold', 'government_bond', 'coperate_bond', 'digital_asset');--> statement-breakpoint
ALTER TYPE "public"."asset_type" RENAME TO "investment_type";--> statement-breakpoint
DROP TABLE "asset" CASCADE;--> statement-breakpoint
ALTER TABLE "investment_account" RENAME COLUMN "asset_types" TO "investment_types";--> statement-breakpoint
-- DROP TYPE "public"."asset_type";--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('thai_cash', 'thai_fixed_cash', 'foreign_cash', 'thai_stock', 'offshore_stock', 'gold', 'thai_government_bond', 'thai_coperate_bond', 'foreign_government_bond', 'foreign_coperate_bond', 'digital_asset');