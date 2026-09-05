CREATE TABLE "sec_fund_symbol" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sec_fund_symbol_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"symbol" text NOT NULL,
	"project_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sec_fund_symbol_symbol_unique" UNIQUE("symbol")
);

-- No seed rows: the map names the funds actually held, which is exactly what
-- this table exists to keep out of the repo. Populate it from the dashboard
-- Settings page or by SQL after migrating.
