CREATE TYPE "public"."staking_provider_type" AS ENUM('solana_native', 'hyperliquid', 'etherfi_liquid', 'manual');--> statement-breakpoint
CREATE TYPE "public"."staking_sync_source_type" AS ENUM('chain', 'apy_projection', 'manual');--> statement-breakpoint
CREATE TABLE "staked_position_daily" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "staked_position_daily_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"staked_position_id" integer NOT NULL,
	"current_underlying" numeric NOT NULL,
	"deposited_underlying" numeric NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "staked_position_daily_staked_position_id_date_unique" UNIQUE("staked_position_id","date")
);
--> statement-breakpoint
CREATE TABLE "staked_position" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "staked_position_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"asset_id" integer,
	"name" text NOT NULL,
	"provider" "staking_provider_type" NOT NULL,
	"underlying_symbol" text NOT NULL,
	"deposited_underlying" numeric DEFAULT '0' NOT NULL,
	"current_underlying" numeric DEFAULT '0' NOT NULL,
	"receipt_symbol" text,
	"receipt_amount" numeric,
	"projected_apy" numeric,
	"staked_since" date,
	"sync_config" jsonb,
	"sync_source" "staking_sync_source_type",
	"synced_at" timestamp,
	"sync_error" text,
	CONSTRAINT "staked_position_asset_id_unique" UNIQUE("asset_id")
);
--> statement-breakpoint
ALTER TABLE "staked_position_daily" ADD CONSTRAINT "staked_position_daily_staked_position_id_staked_position_id_fk" FOREIGN KEY ("staked_position_id") REFERENCES "public"."staked_position"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staked_position" ADD CONSTRAINT "staked_position_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;