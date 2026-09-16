import z from "zod";

export const etherfiLiquidConfigSchema = z
  .object({
    chain: z.enum(["ethereum", "optimism"]),
    wallet: z.string(),
    vault: z.string(),
    accountant: z.string(),
    rateDecimals: z.number().int(),
    quote: z.string().optional(),
    vaultSymbol: z.string().optional(),
    shareSource: z.enum(["wallet", "aave_v4"]).optional(),
    lendGateway: z.string().optional(),
  })
  // RPC URL comes from ETH_RPC_URL / OP_RPC_URL env — never from syncConfig.
  .strict()
  .superRefine((config, ctx) => {
    if (config.shareSource === "aave_v4" && config.lendGateway == null) {
      ctx.addIssue({
        code: "custom",
        message: "lendGateway is required when shareSource is aave_v4",
        path: ["lendGateway"],
      });
    }
  });

export type EtherfiLiquidConfig = z.infer<typeof etherfiLiquidConfigSchema>;

/** `lending_monitor.sync_config` for provider `etherfi_cash`. Wallet is a column. */
export const etherfiCashMonitorConfigSchema = z
  .object({
    chain: z.enum(["ethereum", "optimism"]),
    lendGateway: z.string(),
    priceProvider: z.string(),
    cashSymbols: z.array(z.string()).min(1),
  })
  .strict();

export type EtherfiCashMonitorConfig = z.infer<
  typeof etherfiCashMonitorConfigSchema
>;
