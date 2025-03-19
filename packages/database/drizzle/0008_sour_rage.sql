CREATE TYPE "public"."symbol_type" AS ENUM('thai_stock', 'thai_mutual_fund', 'offshore_stock', 'cryptocurrency');--> statement-breakpoint
CREATE TABLE "asset" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "asset_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"symbol" text,
	"investment_account_id" integer NOT NULL,
	"symbol_type" "symbol_type",
	"asset_type" "asset_type" NOT NULL,
	"asset_class" "asset_class" NOT NULL,
	"risk_level" "risk_level_type" NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"unit" text NOT NULL,
	"average_cost" numeric DEFAULT '1' NOT NULL,
	"current_price" numeric DEFAULT '1' NOT NULL,
	"currency_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_investment_account_id_investment_account_id_fk" FOREIGN KEY ("investment_account_id") REFERENCES "public"."investment_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_currency_id_currency_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currency"("id") ON DELETE no action ON UPDATE no action;