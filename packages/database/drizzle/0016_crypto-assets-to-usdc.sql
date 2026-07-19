-- Data migration: crypto assets move from Binance.th THB pairs to CoinGecko
-- USD pricing, converted to THB through a dedicated stablecoin FX row
-- (USD/THB via Bitkub's USDC/THB market).
--
-- Statements are idempotent so this runs cleanly whether or not the rename
-- already happened (e.g. on a clone where an earlier draft was applied).
--
-- REVIEW BEFORE RUNNING:
--   * Seeds the USDC row's rate from the lowest-id USD row; the next cron
--     run refreshes it from Bitkub THB_USDC.
--   * Assumes that USD row's value_in_thb is current and non-zero.

-- 1. Dedicated FX row for crypto: symbol USD, variant USDC (rate = USDC/THB).
INSERT INTO "currency" ("symbol", "variant", "value_in_thb", "updated_at")
SELECT
	'USD', 'USDC',
	(SELECT "value_in_thb" FROM "currency" WHERE "symbol" = 'USD' ORDER BY "id" LIMIT 1),
	now()
WHERE NOT EXISTS (
	SELECT 1 FROM "currency" WHERE "symbol" = 'USD' AND "variant" = 'USDC'
);
--> statement-breakpoint

-- 2. Rename THB pairs to plain symbols and convert THB-denominated
--    average_cost / current_price to USD at the current rate.
UPDATE "asset"
SET
	"symbol" = left("symbol", -3),
	"average_cost" = "average_cost" / (SELECT "value_in_thb" FROM "currency" WHERE "symbol" = 'USD' AND "variant" = 'USDC'),
	"current_price" = "current_price" / (SELECT "value_in_thb" FROM "currency" WHERE "symbol" = 'USD' AND "variant" = 'USDC')
WHERE "symbol" IN ('BTCTHB', 'ETHTHB', 'SOLTHB');
--> statement-breakpoint

-- 3. All crypto assets convert through the USDC rate row.
UPDATE "asset"
SET "currency_id" = (SELECT "id" FROM "currency" WHERE "symbol" = 'USD' AND "variant" = 'USDC')
WHERE "symbol_type" = 'cryptocurrency';
