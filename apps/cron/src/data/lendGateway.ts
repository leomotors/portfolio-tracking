import type { EtherfiCashMonitorConfig } from "./etherfiCash.js";
import {
  fetchErc20Decimals,
  fetchErc20Symbol,
  fetchEtherfiUsdPrice,
  fetchLendGatewayAccountData,
  fetchLendGatewayDebt,
  fetchLendGatewayRegisteredAssets,
  fetchLendGatewaySupplied,
  toUnits,
} from "./evm.js";

export type EtherfiCashPositionsConfig = EtherfiCashMonitorConfig & {
  wallet: string;
};

type AssetMeta = {
  address: string;
  symbol: string;
  decimals: number;
  supplied: number;
  debt: number;
};

async function loadRegisteredAssets(
  config: EtherfiCashPositionsConfig,
): Promise<AssetMeta[]> {
  const addresses = await fetchLendGatewayRegisteredAssets(
    config.chain,
    config.lendGateway,
  );

  return Promise.all(
    addresses.map(async (address) => {
      const [symbol, decimals, suppliedRaw, debtRaw] = await Promise.all([
        fetchErc20Symbol(config.chain, address),
        fetchErc20Decimals(config.chain, address),
        fetchLendGatewaySupplied(
          config.chain,
          config.lendGateway,
          config.wallet,
          address,
        ),
        fetchLendGatewayDebt(
          config.chain,
          config.lendGateway,
          config.wallet,
          address,
        ),
      ]);
      return {
        address,
        symbol,
        decimals,
        supplied: toUnits(suppliedRaw, decimals),
        debt: toUnits(debtRaw, decimals),
      };
    }),
  );
}

export async function fetchEtherfiCashPositions(
  config: EtherfiCashPositionsConfig,
) {
  const [assets, account] = await Promise.all([
    loadRegisteredAssets(config),
    fetchLendGatewayAccountData(
      config.chain,
      config.lendGateway,
      config.wallet,
    ),
  ]);

  const cashSymbols = new Set(config.cashSymbols);
  const missing = config.cashSymbols.filter(
    (symbol) => !assets.some((a) => a.symbol === symbol),
  );
  if (missing.length > 0) {
    throw new Error(
      `LendGateway is missing cash symbols: ${missing.join(", ")}`,
    );
  }

  const priced = assets.filter((a) => cashSymbols.has(a.symbol) || a.debt > 0);
  const prices = new Map(
    await Promise.all(
      priced.map(
        async (a) =>
          [
            a.symbol,
            await fetchEtherfiUsdPrice(
              config.chain,
              config.priceProvider,
              a.address,
            ),
          ] as const,
      ),
    ),
  );

  const cash = assets
    .filter((a) => cashSymbols.has(a.symbol))
    .map((a) => ({
      symbol: a.symbol,
      amount: a.supplied,
      usd: a.supplied * (prices.get(a.symbol) ?? 0),
    }));

  const borrowed = assets
    .filter((a) => a.debt > 0)
    .map((a) => ({
      symbol: a.symbol,
      amount: a.debt,
      usd: a.debt * (prices.get(a.symbol) ?? 0),
    }));

  return { cash, borrowed, account };
}
