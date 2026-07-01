CREATE TYPE "public"."real_estate_property_type" AS ENUM('condominium', 'detached_house', 'townhouse', 'land', 'commercial', 'other');--> statement-breakpoint
CREATE TABLE "real_estate_property" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "real_estate_property_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"property_type" "real_estate_property_type" DEFAULT 'other' NOT NULL,
	"address" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"area_sqm" numeric(12, 2),
	"currency_id" integer NOT NULL,
	"purchase_cost" numeric DEFAULT '0' NOT NULL,
	"current_value" numeric DEFAULT '0' NOT NULL,
	"value_updated_at" timestamp DEFAULT now(),
	"risk_level" "risk_level_type" DEFAULT 'lower_satellite' NOT NULL,
	"acquired_at" date,
	"closed_at" date,
	"notes" text[] DEFAULT ARRAY[]::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "real_estate_daily_balance" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "real_estate_daily_balance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"real_estate_property_id" integer NOT NULL,
	"cost" numeric NOT NULL,
	"value" numeric NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "real_estate_daily_balance_real_estate_property_id_date_unique" UNIQUE("real_estate_property_id","date")
);
--> statement-breakpoint
ALTER TABLE "real_estate_property" ADD CONSTRAINT "real_estate_property_currency_id_currency_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currency"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "real_estate_daily_balance" ADD CONSTRAINT "real_estate_daily_balance_real_estate_property_id_real_estate_property_id_fk" FOREIGN KEY ("real_estate_property_id") REFERENCES "public"."real_estate_property"("id") ON DELETE cascade ON UPDATE no action;
