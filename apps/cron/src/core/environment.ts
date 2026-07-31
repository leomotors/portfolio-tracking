import { z } from "zod";

export const environmentSchema = z.object({
  DRY_RUN: z.coerce.boolean().default(false),
  DISCORD_WEBHOOK_URL: z.string(),
  /** SEC Thailand API v2 (Fund daily NAV) — Azure API Management key */
  SEC_OCP_APIM_SUBSCRIPTION_KEY: z.string().optional(),
  /** Free Demo API key for stable CoinGecko rate limits; keyless works too */
  COINGECKO_API_KEY: z.string().optional(),
  SOLANA_RPC_URL: z.string().default("https://api.mainnet-beta.solana.com"),
  ETH_RPC_URL: z.string().default("https://ethereum-rpc.publicnode.com"),
  OP_RPC_URL: z.string().default("https://optimism-rpc.publicnode.com"),
});

export type Environment = z.infer<typeof environmentSchema>;

let cached: Environment | undefined;

function load(): Environment {
  if (!cached) cached = environmentSchema.parse(process.env);
  return cached;
}

// Lazy like @repo/database's environment so importing a data module in tests
// doesn't demand the full cron env.
export const environment: Environment = new Proxy({} as Environment, {
  get(_target, prop, receiver) {
    return Reflect.get(load() as object, prop, receiver);
  },
});
