CREATE TYPE "public"."lending_provider_type" AS ENUM('etherfi_cash');--> statement-breakpoint
CREATE TABLE "lending_monitor" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lending_monitor_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"provider" "lending_provider_type" NOT NULL,
	"wallet" text NOT NULL,
	"sync_config" jsonb NOT NULL
);
