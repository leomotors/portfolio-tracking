ALTER TABLE "pnl_event" ADD COLUMN "currency_id" integer;--> statement-breakpoint
ALTER TABLE "pnl_event" ADD COLUMN "value_in_thb" numeric;--> statement-breakpoint
UPDATE "pnl_event"
SET
	"currency_id" = (SELECT "id" FROM "currency" WHERE "symbol" = 'THB' ORDER BY "id" LIMIT 1),
	"value_in_thb" = 1
WHERE "currency_id" IS NULL;--> statement-breakpoint
ALTER TABLE "pnl_event" ALTER COLUMN "currency_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pnl_event" ALTER COLUMN "value_in_thb" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pnl_event" ADD CONSTRAINT "pnl_event_currency_id_currency_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currency"("id") ON DELETE no action ON UPDATE no action;
