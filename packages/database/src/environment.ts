import { z } from "zod";

export const EnvironmentSchema = z.object({
  DATABASE_URL: z.string(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

let cached: Environment | undefined;

function load(): Environment {
  if (!cached) cached = EnvironmentSchema.parse(process.env);
  return cached;
}

export const environment: Environment = new Proxy({} as Environment, {
  get(_target, prop, receiver) {
    return Reflect.get(load() as object, prop, receiver);
  },
});
