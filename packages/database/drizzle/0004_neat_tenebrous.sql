CREATE TYPE "public"."risk_level_type" AS ENUM('cash', 'safe_core', 'surface_core', 'lower_satellite', 'mid_satellite', 'higher_satellite');--> statement-breakpoint
ALTER TYPE "public"."asset_type" ADD VALUE 'cash' BEFORE 'mutual_fund';--> statement-breakpoint
CREATE TABLE "asset" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "asset_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"risk_level" "risk_level_type" NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"unit" text NOT NULL,
	"average_cost" numeric DEFAULT '0' NOT NULL,
	"current_price" numeric DEFAULT '0' NOT NULL,
	"currency_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currency" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "currency_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"symbol" text NOT NULL,
	"variant" text,
	"value_in_thb" numeric DEFAULT '0' NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "currency_symbol_variant_unique" UNIQUE NULLS NOT DISTINCT("symbol","variant")
);
--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_currency_id_currency_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currency"("id") ON DELETE no action ON UPDATE no action;