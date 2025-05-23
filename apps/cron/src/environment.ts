import { z } from "zod";

export const environmentSchema = z.object({
  DRY_RUN: z.coerce.boolean().default(false),
  DISCORD_WEBHOOK_URL: z.string(),
});

export const environment = environmentSchema.parse(process.env);
