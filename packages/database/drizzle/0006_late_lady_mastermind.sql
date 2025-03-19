ALTER TABLE "public"."asset" ALTER COLUMN "risk_level" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."risk_level_type";--> statement-breakpoint
CREATE TYPE "public"."risk_level_type" AS ENUM('safe_core', 'surface_core', 'lower_satellite', 'mid_satellite', 'higher_satellite');--> statement-breakpoint
ALTER TABLE "public"."asset" ALTER COLUMN "risk_level" SET DATA TYPE "public"."risk_level_type" USING "risk_level"::"public"."risk_level_type";