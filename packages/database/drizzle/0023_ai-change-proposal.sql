CREATE TYPE "public"."ai_proposal_status" AS ENUM('pending', 'applied', 'rejected', 'revision_requested');--> statement-breakpoint
CREATE TABLE "ai_change_proposal" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ai_change_proposal_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"message_id" integer,
	"status" "ai_proposal_status" DEFAULT 'pending' NOT NULL,
	"summary" text NOT NULL,
	"operations" jsonb NOT NULL,
	"preview" jsonb NOT NULL,
	"user_note" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_change_proposal" ADD CONSTRAINT "ai_change_proposal_conversation_id_ai_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_change_proposal" ADD CONSTRAINT "ai_change_proposal_message_id_ai_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_change_proposal_conversation_id_idx" ON "ai_change_proposal" USING btree ("conversation_id");