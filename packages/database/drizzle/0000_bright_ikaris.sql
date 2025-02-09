CREATE TYPE "public"."bank_account_type" AS ENUM('savings', 'e_savings', 'fixed', 'fcd');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('mutual_fund', 'thai_stock', 'offshore_stock_dr', 'us_stock', 'us_stock_drx', 'gold', 'government_bond', 'coperate_bond', 'digital_asset');--> statement-breakpoint
CREATE TYPE "public"."credit_card_type" AS ENUM('visa', 'mastercard', 'american_express', 'jcb', 'unionpay');--> statement-breakpoint
CREATE TABLE "bank_account" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bank_account_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"bank" text NOT NULL,
	"branch" text,
	"account_no" text NOT NULL,
	"current_balance" numeric DEFAULT '0' NOT NULL,
	"interest_rate" numeric DEFAULT '0' NOT NULL,
	"account_type" "bank_account_type",
	"opened_at" date,
	"closed_at" date,
	"remarks" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	CONSTRAINT "bank_account_account_no_unique" UNIQUE("account_no")
);
--> statement-breakpoint
CREATE TABLE "bank_daily_balance" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bank_daily_balance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"bank_account_id" integer NOT NULL,
	"balance" numeric NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_account" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "investment_account_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"account_no" text NOT NULL,
	"current_cost" numeric DEFAULT '0' NOT NULL,
	"current_value" numeric DEFAULT '0' NOT NULL,
	"opened_at" date,
	"asset_types" "asset_type"[] DEFAULT ARRAY[]::asset_type[],
	CONSTRAINT "investment_account_account_no_unique" UNIQUE("account_no")
);
--> statement-breakpoint
CREATE TABLE "investment_daily_balance" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "investment_daily_balance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"investment_account_id" integer NOT NULL,
	"cost" numeric NOT NULL,
	"value" numeric NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_card_account" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credit_card_account_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"issued_by" text NOT NULL,
	"card_type" "credit_card_type" NOT NULL,
	"card_no" text NOT NULL,
	"credit_limit" numeric NOT NULL,
	"credit_line" numeric NOT NULL,
	"statement_date" integer NOT NULL,
	"interest_free_period" integer NOT NULL,
	"interest_rate" numeric NOT NULL,
	"opened_at" date NOT NULL,
	CONSTRAINT "credit_card_account_card_no_unique" UNIQUE("card_no")
);
--> statement-breakpoint
CREATE TABLE "personal_loan_account" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "personal_loan_account_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"issued_by" text NOT NULL,
	"credit_limit" numeric NOT NULL,
	"opened_at" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_daily_balance" ADD CONSTRAINT "bank_daily_balance_bank_account_id_bank_account_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_daily_balance" ADD CONSTRAINT "investment_daily_balance_investment_account_id_investment_account_id_fk" FOREIGN KEY ("investment_account_id") REFERENCES "public"."investment_account"("id") ON DELETE cascade ON UPDATE no action;