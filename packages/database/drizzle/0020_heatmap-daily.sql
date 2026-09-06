CREATE TABLE "heatmap_daily" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "heatmap_daily_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"date" date NOT NULL,
	"cells" jsonb NOT NULL,
	"color_scale_max" numeric NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "heatmap_daily_date_unique" UNIQUE("date")
);
