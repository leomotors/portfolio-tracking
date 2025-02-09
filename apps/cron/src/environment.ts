import { z } from "zod";

export const environmentSchema = z.object({
  DRY_RUN: z.coerce.boolean().default(false),
});

export const environment = environmentSchema.parse(process.env);
