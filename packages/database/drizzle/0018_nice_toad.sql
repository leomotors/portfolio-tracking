CREATE TABLE "coingecko_symbol" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coingecko_symbol_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"symbol" text NOT NULL,
	"coingecko_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coingecko_symbol_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint

-- Seed the map that used to live in apps/cron/src/data/coingecko.ts.
-- Further symbols are added via SQL or the dashboard Settings page.
INSERT INTO "coingecko_symbol" ("symbol", "coingecko_id")
VALUES
	('BTC', 'bitcoin'),
	('WBTC', 'wrapped-bitcoin'),
	('ETH', 'ethereum'),
	('SOL', 'solana'),
	('HYPE', 'hyperliquid')
ON CONFLICT ("symbol") DO NOTHING;
