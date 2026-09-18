"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";

import { Sensitive } from "@/components/app/sensitive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAsset, updateInvestmentAccountCost } from "@/lib/db/actions";
import { type CurrencyRow, roundThb } from "@/lib/portfolio/aggregate";
import {
  ASSET_CLASSES,
  ASSET_TYPE_LABEL,
  ASSET_TYPES_BY_CLASS,
  type AssetClass,
  type AssetType,
  defaultAssetType,
  defaultSymbolType,
  defaultUnit,
  RISK_LEVELS,
  type RiskLevel,
  SYMBOL_TYPE_LABEL,
  SYMBOL_TYPES,
  type SymbolType,
} from "@/lib/portfolio/asset-fields";
import { CLASS_LABEL, RISK_LABEL } from "@/lib/portfolio/colors";
import { thb } from "@/lib/portfolio/format";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-3 text-[13px] text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[12px] text-[var(--ink-3)]">{label}</span>
      {children}
    </label>
  );
}

function defaultCurrencyId(currencies: CurrencyRow[]) {
  return (
    currencies.find((c) => c.symbol === "THB")?.id ?? currencies[0]?.id ?? 0
  );
}

export function AddAssetForm({
  accountId,
  accountCost,
  currencies,
  existingSymbols,
  onDone,
}: {
  accountId: number;
  accountCost: number;
  currencies: CurrencyRow[];
  existingSymbols: string[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass>("stock");
  const [assetType, setAssetType] = useState<AssetType>("thai_stock");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("mid_satellite");
  const [symbolType, setSymbolType] = useState<SymbolType | "">("thai_stock");
  const [currencyId, setCurrencyId] = useState(() =>
    defaultCurrencyId(currencies),
  );
  const [unit, setUnit] = useState("share");
  const [amount, setAmount] = useState("");
  const [averageCost, setAverageCost] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [addToAccountCost, setAddToAccountCost] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const currency = currencies.find((c) => c.id === currencyId);
  const typeOptions = ASSET_TYPES_BY_CLASS[assetClass];
  const existing = useMemo(
    () => new Set(existingSymbols.map((s) => s.toUpperCase())),
    [existingSymbols],
  );
  const duplicateSymbol =
    symbol.trim().length > 0 && existing.has(symbol.trim().toUpperCase());

  const amountN = parseFloat(amount);
  const avgN = parseFloat(averageCost);
  const fx = currency?.valueInTHB ?? 1;
  const purchaseThb =
    Number.isFinite(amountN) && Number.isFinite(avgN)
      ? amountN * avgN * fx
      : null;

  function applyClass(nextClass: AssetClass) {
    const nextType = defaultAssetType(nextClass);
    const nextSymbolType = defaultSymbolType(nextClass, nextType);
    setAssetClass(nextClass);
    setAssetType(nextType);
    setSymbolType(nextSymbolType ?? "");
    setUnit(defaultUnit(nextClass, symbol, currency?.symbol ?? "THB"));
    if (nextClass === "cash") {
      setAverageCost((v) => v || "1");
      setCurrentPrice((v) => v || "1");
    }
  }

  function applyType(nextType: AssetType) {
    setAssetType(nextType);
    const nextSymbolType = defaultSymbolType(assetClass, nextType);
    if (nextSymbolType) setSymbolType(nextSymbolType);
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const nextAmount = parseFloat(amount);
        const nextAvg = parseFloat(averageCost);
        const nextPrice =
          currentPrice.trim() === "" ? nextAvg : parseFloat(currentPrice);
        if (!name.trim()) {
          setError("Enter a name.");
          return;
        }
        if (!Number.isFinite(nextAmount) || nextAmount < 0) {
          setError("Enter a valid amount.");
          return;
        }
        if (!Number.isFinite(nextAvg) || nextAvg < 0) {
          setError("Enter a valid average cost.");
          return;
        }
        if (!Number.isFinite(nextPrice) || nextPrice < 0) {
          setError("Enter a valid current price.");
          return;
        }
        if (!currencyId) {
          setError("Pick a currency.");
          return;
        }
        if (symbolType && !symbol.trim()) {
          setError("Symbol is required for priced holdings.");
          return;
        }
        setError(null);
        startTransition(async () => {
          try {
            await createAsset({
              investmentAccountId: accountId,
              name,
              symbol: symbol.trim() || null,
              symbolType: symbolType === "" ? null : symbolType,
              assetType,
              assetClass,
              riskLevel,
              amount: nextAmount,
              unit:
                unit.trim() ||
                defaultUnit(assetClass, symbol, currency?.symbol ?? "THB"),
              averageCost: nextAvg,
              currentPrice: nextPrice,
              currencyId,
            });
            if (addToAccountCost && purchaseThb != null && purchaseThb > 0) {
              await updateInvestmentAccountCost(
                accountId,
                roundThb(accountCost + purchaseThb),
              );
            }
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save");
          }
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input
            required
            value={name}
            placeholder="Bitcoin"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Symbol">
          <Input
            value={symbol}
            placeholder="BTC"
            onChange={(e) => {
              const next = e.target.value;
              setSymbol(next);
              if (!unit || unit === symbol) {
                setUnit(
                  defaultUnit(assetClass, next, currency?.symbol ?? "THB"),
                );
              }
            }}
          />
        </Field>
      </div>
      {duplicateSymbol && (
        <p className="text-[12px] text-[var(--ink-2)]">
          This account already has {symbol.trim()}. Edit that row unless this is
          a separate lot.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Class">
          <select
            className={SELECT_CLASS}
            value={assetClass}
            onChange={(e) => applyClass(e.target.value as AssetClass)}
          >
            {ASSET_CLASSES.map((value) => (
              <option key={value} value={value}>
                {CLASS_LABEL[value] ?? value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            className={SELECT_CLASS}
            value={assetType}
            onChange={(e) => applyType(e.target.value as AssetType)}
          >
            {typeOptions.map((value) => (
              <option key={value} value={value}>
                {ASSET_TYPE_LABEL[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Risk">
          <select
            className={SELECT_CLASS}
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
          >
            {RISK_LEVELS.map((value) => (
              <option key={value} value={value}>
                {RISK_LABEL[value] ?? value}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Price source">
          <select
            className={SELECT_CLASS}
            value={symbolType}
            onChange={(e) => setSymbolType(e.target.value as SymbolType | "")}
          >
            <option value="">None (manual price)</option>
            {SYMBOL_TYPES.map((value) => (
              <option key={value} value={value}>
                {SYMBOL_TYPE_LABEL[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Currency">
          <select
            className={SELECT_CLASS}
            value={currencyId}
            onChange={(e) => setCurrencyId(Number(e.target.value))}
          >
            {currencies.map((row) => (
              <option key={row.id} value={row.id}>
                {row.variant ? `${row.symbol} (${row.variant})` : row.symbol}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit">
          <Input
            required
            value={unit}
            placeholder="share"
            onChange={(e) => setUnit(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label={`Amount (${unit || "units"})`}>
          <Input
            type="number"
            step="any"
            min="0"
            required
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label={`Avg cost (${currency?.symbol ?? "native"})`}>
          <Input
            type="number"
            step="any"
            min="0"
            required
            placeholder="0"
            value={averageCost}
            onChange={(e) => setAverageCost(e.target.value)}
          />
        </Field>
        <Field label="Current price">
          <Input
            type="number"
            step="any"
            min="0"
            placeholder="Same as avg cost"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
          />
        </Field>
      </div>
      {purchaseThb != null && (
        <p className="text-[12px] text-[var(--ink-2)]">
          Purchase cost ≈{" "}
          <Sensitive>{thb(purchaseThb, { decimals: 2 })}</Sensitive>
          {currency?.symbol !== "THB" && ` at ${fx} THB/${currency?.symbol}`}
        </p>
      )}
      <label className="flex items-start gap-2 text-[12px] leading-5 text-[var(--ink-2)]">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={addToAccountCost}
          onChange={(e) => setAddToAccountCost(e.target.checked)}
        />
        <span>
          Add this purchase to the account cost basis. Uncheck if it was funded
          from cash already in this account.
        </span>
      </label>
      {symbolType === "cryptocurrency" && (
        <p className="text-[12px] text-[var(--ink-3)]">
          Map this symbol to a CoinGecko id in Settings so cron can price it.
        </p>
      )}
      {symbolType === "thai_mutual_fund" && (
        <p className="text-[12px] text-[var(--ink-3)]">
          Map this symbol to an SEC project id in Settings so cron can price it.
        </p>
      )}
      {error && <p className="text-[12px] text-[var(--accent-neg)]">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add position"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
