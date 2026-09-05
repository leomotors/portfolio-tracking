"use client";

import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createCoingeckoSymbol,
  createSecFundSymbol,
  deleteCoingeckoSymbol,
  deleteSecFundSymbol,
  updateCoingeckoSymbol,
  updateSecFundSymbol,
} from "@/lib/db/actions";
import { type CoingeckoSymbol, type SecFundSymbol } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
  maps: CoingeckoSymbol[];
  unmapped: string[];
  secMaps: SecFundSymbol[];
  secUnmapped: string[];
}

export function SettingsClient({
  maps,
  unmapped,
  secMaps,
  secUnmapped,
}: SettingsClientProps) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker="Settings"
        title="Price sources"
        sub="Remote ids the daily cron uses to price assets. Symbol must match asset.symbol exactly."
      />

      <MappingCard
        title="CoinGecko map"
        description="MTS-GOLD stays hardcoded to Tether Gold. Everything else with symbol_type cryptocurrency looks up a row here."
        valueLabel="CoinGecko id"
        symbolPlaceholder="BTC"
        valuePlaceholder="bitcoin"
        emptyText="No mappings yet. Add a row so the cron can price cryptocurrency assets."
        rows={maps.map((row) => ({
          id: row.id,
          symbol: row.symbol,
          value: row.coingeckoId,
        }))}
        unmapped={unmapped}
        onCreate={(symbol, value) => createCoingeckoSymbol(symbol, value)}
        onUpdateSymbol={(id, symbol) => updateCoingeckoSymbol(id, { symbol })}
        onUpdateValue={(id, coingeckoId) =>
          updateCoingeckoSymbol(id, { coingeckoId })
        }
        onDelete={(id) => deleteCoingeckoSymbol(id)}
      />

      <MappingCard
        title="SEC fund map"
        description="SEC project id per fund class for symbol_type thai_mutual_fund. Classes of one project share an id — SCBNDQ(A) and SCBNDQ(E) both use M0311_2564."
        valueLabel="SEC project id"
        symbolPlaceholder="SCBNDQ(E)"
        valuePlaceholder="M0311_2564"
        emptyText="No mappings yet. Add a row so the cron can price Thai mutual funds."
        rows={secMaps.map((row) => ({
          id: row.id,
          symbol: row.symbol,
          value: row.projectId,
        }))}
        unmapped={secUnmapped}
        onCreate={(symbol, value) => createSecFundSymbol(symbol, value)}
        onUpdateSymbol={(id, symbol) => updateSecFundSymbol(id, { symbol })}
        onUpdateValue={(id, projectId) =>
          updateSecFundSymbol(id, { projectId })
        }
        onDelete={(id) => deleteSecFundSymbol(id)}
      />
    </div>
  );
}

interface MappingRow {
  id: number;
  symbol: string;
  value: string;
}

interface MappingCardProps {
  title: string;
  description: string;
  valueLabel: string;
  symbolPlaceholder: string;
  valuePlaceholder: string;
  emptyText: string;
  rows: MappingRow[];
  unmapped: string[];
  onCreate: (symbol: string, value: string) => Promise<void>;
  onUpdateSymbol: (id: number, symbol: string) => Promise<void>;
  onUpdateValue: (id: number, value: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function MappingCard({
  title,
  description,
  valueLabel,
  symbolPlaceholder,
  valuePlaceholder,
  emptyText,
  rows,
  unmapped,
  onCreate,
  onUpdateSymbol,
  onUpdateValue,
  onDelete,
}: MappingCardProps) {
  const [symbol, setSymbol] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {unmapped.length > 0 && (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface-2)] px-3 py-3"
          >
            <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink)]">
              <AlertTriangle
                size={14}
                strokeWidth={2}
                className="text-[var(--accent-neg)]"
                aria-hidden
              />
              Unmapped holdings. Cron will skip these until a row exists.
            </div>
            <div className="flex flex-wrap gap-1.5">
              {unmapped.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSymbol(s)}
                  className="num cursor-pointer rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-2 py-1 text-[12px] text-[var(--ink)] hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              async () => {
                await onCreate(symbol, value);
              },
              () => {
                setSymbol("");
                setValue("");
              },
            );
          }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[12px] text-[var(--ink-3)]">Symbol</span>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder={symbolPlaceholder}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
              aria-label="Asset symbol"
            />
          </label>
          <label className="flex min-w-0 flex-[2] flex-col gap-1">
            <span className="text-[12px] text-[var(--ink-3)]">
              {valueLabel}
            </span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={valuePlaceholder}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
              aria-label={valueLabel}
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            disabled={pending}
            className="sm:mb-px"
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Add mapping
          </Button>
        </form>

        {error && (
          <p role="alert" className="text-[13px] text-[var(--accent-neg)]">
            {error}
          </p>
        )}

        {rows.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-2)]">{emptyText}</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <Th>Symbol</Th>
                  <Th>{valueLabel}</Th>
                  <Th align="right">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--hover)]">
                    <Td>
                      <EditableText
                        value={row.symbol}
                        ariaLabel={`Edit symbol ${row.symbol}`}
                        mono
                        onSave={(next) => onUpdateSymbol(row.id, next)}
                      />
                    </Td>
                    <Td>
                      <EditableText
                        value={row.value}
                        ariaLabel={`Edit ${valueLabel} for ${row.symbol}`}
                        onSave={(next) => onUpdateValue(row.id, next)}
                      />
                    </Td>
                    <Td align="right">
                      <button
                        type="button"
                        aria-label={`Delete mapping for ${row.symbol}`}
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            await onDelete(row.id);
                          })
                        }
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--ink-3)] hover:bg-[var(--hover)] hover:text-[var(--accent-neg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)] disabled:opacity-50"
                      >
                        <Trash2 size={14} strokeWidth={2} aria-hidden />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditableText({
  value,
  onSave,
  ariaLabel,
  mono,
}: {
  value: string;
  onSave: (value: string) => Promise<void>;
  ariaLabel: string;
  mono?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const next = draft.trim();
    if (!next || next === value) {
      setEditing(false);
      setError(null);
      setDraft(value);
      return;
    }
    startTransition(async () => {
      try {
        await onSave(next);
        setEditing(false);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          setDraft(value);
          setError(null);
          setEditing(true);
        }}
        className="group inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-[var(--hover)] hover:text-[var(--accent-pri)]"
      >
        <span className={cn("truncate", mono && "num font-semibold")}>
          {value}
        </span>
        <Pencil
          size={11}
          strokeWidth={2}
          className="opacity-0 transition-opacity group-hover:opacity-100"
        />
      </button>
    );
  }

  return (
    <span className="flex flex-col gap-1">
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") {
              setEditing(false);
              setError(null);
              setDraft(value);
            }
          }}
          className="w-full min-w-[140px] rounded-md border border-[var(--accent-pri)] bg-[var(--surface)] px-2 py-1 text-[var(--ink)]"
        />
        <button
          type="button"
          onClick={commit}
          disabled={pending}
          className="cursor-pointer rounded-md bg-[var(--accent-pri)] px-2.5 py-1 text-[11px] text-[var(--accent-pri-ink)] disabled:opacity-50"
        >
          {pending ? "saving…" : "save"}
        </button>
      </span>
      {error && (
        <span role="alert" className="text-[11px] text-[var(--accent-neg)]">
          {error}
        </span>
      )}
    </span>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "border-b border-[var(--hairline)] bg-[var(--surface-3)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-2)]",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "border-b border-[var(--hairline-2)] px-4 py-3 align-middle",
        align === "right"
          ? "text-right text-[var(--ink)]"
          : "text-left text-[var(--ink-2)]",
      )}
    >
      {children}
    </td>
  );
}
