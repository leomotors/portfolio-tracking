CREATE TABLE "fcd_account" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fcd_account_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"bank" text NOT NULL,
	"branch" text,
	"account_no" text NOT NULL,
	"currency" text NOT NULL,
	"interest_rate" numeric DEFAULT '0' NOT NULL,
	"opened_at" date,
	"closed_at" date,
	"remarks" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	CONSTRAINT "fcd_account_account_no_unique" UNIQUE("account_no")
);
--> statement-breakpoint
ALTER TABLE "public"."bank_account" ALTER COLUMN "account_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."bank_account_type";--> statement-breakpoint
CREATE TYPE "public"."bank_account_type" AS ENUM('savings', 'e_savings', 'fixed');--> statement-breakpoint
ALTER TABLE "public"."bank_account" ALTER COLUMN "account_type" SET DATA TYPE "public"."bank_account_type" USING "account_type"::"public"."bank_account_type";