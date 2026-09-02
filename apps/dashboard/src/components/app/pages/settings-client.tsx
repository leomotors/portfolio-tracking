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
  deleteCoingeckoSymbol,
  updateCoingeckoSymbol,
} from "@/lib/db/actions";
import { type CoingeckoSymbol } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
  maps: CoingeckoSymbol[];
  unmapped: string[];
}

export function SettingsClient({ maps, unmapped }: SettingsClientProps) {
  const [symbol, setSymbol] = useState("");
  const [coingeckoId, setCoingeckoId] = useState("");
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
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker="Settings"
        title="Price sources"
        sub="CoinGecko ids the daily cron uses for cryptocurrency assets. Symbol must match asset.symbol exactly."
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>CoinGecko map</CardTitle>
            <CardDescription>
              MTS-GOLD stays hardcoded to Tether Gold. Everything else with
              symbol_type cryptocurrency looks up a row here.
            </CardDescription>
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
                  await createCoingeckoSymbol(symbol, coingeckoId);
                },
                () => {
                  setSymbol("");
                  setCoingeckoId("");
                },
              );
            }}
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[12px] text-[var(--ink-3)]">Symbol</span>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="BTC"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
                aria-label="Asset symbol"
              />
            </label>
            <label className="flex min-w-0 flex-[2] flex-col gap-1">
              <span className="text-[12px] text-[var(--ink-3)]">
                CoinGecko id
              </span>
              <Input
                value={coingeckoId}
                onChange={(e) => setCoingeckoId(e.target.value)}
                placeholder="bitcoin"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
                aria-label="CoinGecko id"
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

          {maps.length === 0 ? (
            <p className="text-[13px] text-[var(--ink-2)]">
              No mappings yet. Add a row so the cron can price cryptocurrency
              assets.
            </p>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[13px]">
                <thead>
                  <tr>
                    <Th>Symbol</Th>
                    <Th>CoinGecko id</Th>
                    <Th align="right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {maps.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--hover)]">
                      <Td>
                        <EditableText
                          value={row.symbol}
                          ariaLabel={`Edit symbol ${row.symbol}`}
                          mono
                          onSave={(next) =>
                            updateCoingeckoSymbol(row.id, { symbol: next })
                          }
                        />
                      </Td>
                      <Td>
                        <EditableText
                          value={row.coingeckoId}
                          ariaLabel={`Edit CoinGecko id for ${row.symbol}`}
                          onSave={(next) =>
                            updateCoingeckoSymbol(row.id, { coingeckoId: next })
                          }
                        />
                      </Td>
                      <Td align="right">
                        <button
                          type="button"
                          aria-label={`Delete mapping for ${row.symbol}`}
                          disabled={pending}
                          onClick={() =>
                            run(async () => {
                              await deleteCoingeckoSymbol(row.id);
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
    </div>
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
