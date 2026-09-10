CREATE TYPE "public"."pnl_event_kind" AS ENUM('in_account', 'withdrawn', 'undocumented');--> statement-breakpoint
CREATE TABLE "pnl_event" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pnl_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"investment_account_id" integer NOT NULL,
	"kind" "pnl_event_kind" NOT NULL,
	"occurred_on" date NOT NULL,
	"pnl" numeric NOT NULL,
	"withdraw_amount" numeric,
	"cost_delta" numeric DEFAULT '0' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pnl_event_kind_shape" CHECK ((
        (
          "pnl_event"."kind" in ('in_account', 'undocumented')
          and "pnl_event"."withdraw_amount" is null
          and "pnl_event"."cost_delta" = 0
        )
        or (
          "pnl_event"."kind" = 'withdrawn'
          and "pnl_event"."withdraw_amount" is not null
          and "pnl_event"."withdraw_amount" > 0
        )
      ))
);
--> statement-breakpoint
ALTER TABLE "pnl_event" ADD CONSTRAINT "pnl_event_investment_account_id_investment_account_id_fk" FOREIGN KEY ("investment_account_id") REFERENCES "public"."investment_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pnl_event_account_occurred_on_idx" ON "pnl_event" USING btree ("investment_account_id","occurred_on");--> statement-breakpoint
CREATE INDEX "pnl_event_kind_occurred_on_idx" ON "pnl_event" USING btree ("kind","occurred_on");