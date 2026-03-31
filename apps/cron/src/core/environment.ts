import { z } from "zod";

export const environmentSchema = z.object({
  DRY_RUN: z.coerce.boolean().default(false),
  DISCORD_WEBHOOK_URL: z.string(),
  /** SEC Thailand API v2 (Fund daily NAV) — Azure API Management key */
  SEC_OCP_APIM_SUBSCRIPTION_KEY: z.string().optional(),
});

export const environment = environmentSchema.parse(process.env);
