"use client";

import { Trash2 } from "lucide-react";
import { type ReactNode, useMemo, useState, useTransition } from "react";

import { Chip } from "@/components/app/chip";
import { Delta } from "@/components/app/delta";
import { Sensitive } from "@/components/app/sensitive";
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
  createInAccountPnlEvent,
  createWithdrawnPnlEvent,
  deletePnlEvent,
} from "@/lib/db/actions";
import { type PnlEvent } from "@/lib/db/queries";
import {
  type CurrencyRow,
  eventPnlThb,
  inAccountLoggedPnl,
  takenPnl,
  undocumentedLeftover,
  withdrawCostDelta,
} from "@/lib/portfolio/aggregate";
import { nativeAmount, pct, signedNative, thb } from "@/lib/portfolio/format";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-3 text-[13px] text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]";

const LEFTOVER_BOOK_FLOOR = 1;

function currencyLabel(currency: { symbol: string; variant: string | null }) {
  return currency.variant
    ? `${currency.symbol} (${currency.variant})`
    : currency.symbol;
}

/** THB only. Leftover is a THB figure and must never be booked as anything else. */
function thbCurrencyId(currencies: CurrencyRow[]) {
  return currencies.find((c) => c.symbol === "THB")?.id ?? 0;
}

/** Form default: THB when present, otherwise whatever exists. */
function defaultCurrencyId(currencies: CurrencyRow[]) {
  return thbCurrencyId(currencies) || (currencies[0]?.id ?? 0);
}

function thbFx(currencies: CurrencyRow[], currencyId: number) {
  return currencies.find((c) => c.id === currencyId)?.valueInTHB ?? 1;
}

const KIND_LABEL = {
  in_account: "Rotation",
  withdrawn: "Taken out",
  undocumented: "Undocumented",
} as const;

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AccountPnlLog({
  accountId,
  accountName,
  currentCost,
  accountPnl,
  computedRealized,
  fxSensitive,
  events,
  currencies,
}: {
  accountId: number;
  accountName: string;
  currentCost: number;
  accountPnl: number;
  computedRealized: number;
  /** Account holds non-THB positions, so the leftover drifts with FX. */
  fxSensitive: boolean;
  events: PnlEvent[];
  currencies: CurrencyRow[];
}) {
  const logged = inAccountLoggedPnl(events);
  const leftover = undocumentedLeftover(computedRealized, events);
  const taken = takenPnl(events);
  const [form, setForm] = useState<"rotation" | "withdraw" | null>(null);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Realized log</CardTitle>
          <CardDescription>
            Rotations explain in-account realized. Withdrawals take P/L out of
            this account. Leftover is optional to book.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-x-7 gap-y-3 sm:grid-cols-3">
          <LogStat
            label="Logged"
            hint="Rotations and write-offs"
            value={<Delta value={logged} />}
          />
          <LogStat
            label="Leftover"
            hint={
              fxSensitive
                ? "Computed minus logged · moves with FX"
                : "Computed minus logged"
            }
            value={<Delta value={leftover} />}
          />
          <LogStat
            label="Taken out"
            hint="Withdrawals from this account"
            value={<Delta value={taken} />}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={form === "rotation" ? "default" : "outline"}
            onClick={() =>
              setForm((v) => (v === "rotation" ? null : "rotation"))
            }
          >
            Log rotation
          </Button>
          <Button
            type="button"
            size="sm"
            variant={form === "withdraw" ? "default" : "outline"}
            onClick={() =>
              setForm((v) => (v === "withdraw" ? null : "withdraw"))
            }
          >
            Withdraw / take P/L
          </Button>
          {!fxSensitive && Math.abs(leftover) >= LEFTOVER_BOOK_FLOOR && (
            <BookLeftoverButton
              accountId={accountId}
              leftover={leftover}
              thbCurrencyId={thbCurrencyId(currencies)}
            />
          )}
        </div>

        {fxSensitive && Math.abs(leftover) >= LEFTOVER_BOOK_FLOOR && (
          <p className="text-[12px] text-[var(--ink-3)]">
            Leftover is not bookable here: this account holds foreign-currency
            positions, so it also carries FX translation on cost basis and
            re-appears as the rate moves. Log the rotations instead.
          </p>
        )}

        {form === "rotation" && (
          <RotationForm
            accountId={accountId}
            currencies={currencies}
            onDone={() => setForm(null)}
          />
        )}
        {form === "withdraw" && (
          <WithdrawForm
            accountId={accountId}
            accountName={accountName}
            currentCost={currentCost}
            accountPnl={accountPnl}
            currencies={currencies}
            onDone={() => setForm(null)}
          />
        )}

        {events.length === 0 ? (
          <p className="text-[12px] text-[var(--ink-3)]">
            No realized events yet. Log a rotation after selling one holding to
            buy another, or record a withdrawal that takes P/L out.
          </p>
        ) : (
          <ul className="flex flex-col">
            {events.map((event, index) => (
              <li
                key={event.id}
                className={cn(
                  "-mx-1 flex items-start justify-between gap-3 rounded-[var(--radius)] px-1 py-2.5",
                  index < events.length - 1 &&
                    "border-b border-[var(--hairline-2)]",
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-[12px] text-[var(--ink-3)]">
                      {formatDay(event.occurredOn)}
                    </span>
                    <Chip label={KIND_LABEL[event.kind]} />
                  </div>
                  {event.note && (
                    <p className="mt-1 text-[12px] text-[var(--ink-2)]">
                      {event.note}
                    </p>
                  )}
                  {event.kind === "withdrawn" &&
                    event.withdrawAmount != null && (
                      <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">
                        withdrew{" "}
                        <Sensitive>
                          {nativeAmount(event.withdrawAmount, event.currency)}
                        </Sensitive>
                        {event.currency !== "THB" && (
                          <>
                            {" "}
                            (
                            <Sensitive>
                              {thb(event.withdrawAmount * event.valueInTHB)}
                            </Sensitive>
                            )
                          </>
                        )}
                        {" · "}
                        cost{" "}
                        <Sensitive>
                          {thb(event.costDelta, { sign: true })}
                        </Sensitive>
                      </p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <EventPnlAmount event={event} />
                  <DeleteEventButton eventId={event.id} kind={event.kind} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function LogStat({
  label,
  hint,
  value,
}: {
  label: string;
  hint: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[12px] text-[var(--ink-3)]">{label}</div>
      <div className="num text-[18px] font-medium">{value}</div>
      <div className="text-[11px] leading-4 text-[var(--ink-3)]">{hint}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[12px] text-[var(--ink-3)]">{label}</span>
      {children}
    </label>
  );
}

function EventPnlAmount({ event }: { event: PnlEvent }) {
  const thbValue = eventPnlThb(event);
  if (event.currency === "THB") {
    return <Delta value={thbValue} mini />;
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className={cn(
          "num text-[12px] font-medium",
          thbValue >= 0
            ? "text-[var(--accent-pos)]"
            : "text-[var(--accent-neg)]",
        )}
      >
        <Sensitive>{signedNative(event.pnl, event.currency)}</Sensitive>
      </span>
      <Delta value={thbValue} mini />
    </div>
  );
}

function CurrencySelect({
  currencies,
  value,
  onChange,
}: {
  currencies: CurrencyRow[];
  value: number;
  onChange: (id: number) => void;
}) {
  return (
    <select
      className={SELECT_CLASS}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {currencies.map((currency) => (
        <option key={currency.id} value={currency.id}>
          {currencyLabel(currency)}
        </option>
      ))}
    </select>
  );
}

function RotationForm({
  accountId,
  currencies,
  onDone,
}: {
  accountId: number;
  currencies: CurrencyRow[];
  onDone: () => void;
}) {
  const [occurredOn, setOccurredOn] = useState(todayIso);
  const [currencyId, setCurrencyId] = useState(() =>
    defaultCurrencyId(currencies),
  );
  const [pnl, setPnl] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fx = thbFx(currencies, currencyId);
  const currency = currencies.find((c) => c.id === currencyId);
  const native = parseFloat(pnl);
  const pnlThb = Number.isFinite(native) ? native * fx : null;

  return (
    <form
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const amount = parseFloat(pnl);
        if (!Number.isFinite(amount)) {
          setError("Enter a P/L amount.");
          return;
        }
        if (!currencyId) {
          setError("Pick a currency.");
          return;
        }
        setError(null);
        startTransition(async () => {
          try {
            await createInAccountPnlEvent({
              accountId,
              occurredOn,
              currencyId,
              pnl: amount,
              note,
            });
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save");
          }
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Date">
          <Input
            type="date"
            required
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </Field>
        <Field label="Currency">
          <CurrencySelect
            currencies={currencies}
            value={currencyId}
            onChange={setCurrencyId}
          />
        </Field>
        <Field label={`Realized P/L (${currency?.symbol ?? "native"})`}>
          <Input
            type="number"
            step="any"
            required
            placeholder="726.19"
            value={pnl}
            onChange={(e) => setPnl(e.target.value)}
          />
        </Field>
      </div>
      {pnlThb != null && currency?.symbol !== "THB" && (
        <p className="text-[12px] text-[var(--ink-2)]">
          ≈ <Sensitive>{thb(pnlThb, { sign: true, decimals: 2 })}</Sensitive>
          {" at "}
          {fx} THB/{currency?.symbol}
        </p>
      )}
      <Field label="Note">
        <Input
          type="text"
          placeholder="Sold SET50, rolled to QQQ"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      {error && <p className="text-[12px] text-[var(--accent-neg)]">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save rotation"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function WithdrawForm({
  accountId,
  accountName,
  currentCost,
  accountPnl,
  currencies,
  onDone,
}: {
  accountId: number;
  accountName: string;
  currentCost: number;
  accountPnl: number;
  currencies: CurrencyRow[];
  onDone: () => void;
}) {
  const [occurredOn, setOccurredOn] = useState(todayIso);
  const [currencyId, setCurrencyId] = useState(() =>
    defaultCurrencyId(currencies),
  );
  const [withdraw, setWithdraw] = useState("");
  const [pnl, setPnl] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fx = thbFx(currencies, currencyId);
  const currency = currencies.find((c) => c.id === currencyId);

  const preview = useMemo(() => {
    const w = parseFloat(withdraw);
    const p = parseFloat(pnl);
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(p)) return null;
    const costDelta = withdrawCostDelta(w, p, fx);
    const nextCost = currentCost + costDelta;
    const pnlThb = p * fx;
    if (nextCost < 0)
      return { invalid: "Cost basis would go negative." as const };
    return {
      invalid: null,
      costDelta,
      nextCost,
      pnlThb,
      nextPct: nextCost === 0 ? 0 : (accountPnl - pnlThb) / nextCost,
    };
  }, [accountPnl, currentCost, fx, pnl, withdraw]);

  return (
    <form
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const w = parseFloat(withdraw);
        const p = parseFloat(pnl);
        if (!Number.isFinite(w) || w <= 0) {
          setError("Enter a positive withdraw amount.");
          return;
        }
        if (!Number.isFinite(p)) {
          setError("Enter the P/L portion. Use 0 to return capital only.");
          return;
        }
        if (!currencyId) {
          setError("Pick a currency.");
          return;
        }
        if (preview?.invalid) {
          setError(preview.invalid);
          return;
        }
        setError(null);
        startTransition(async () => {
          try {
            await createWithdrawnPnlEvent({
              accountId,
              occurredOn,
              currencyId,
              pnl: p,
              withdrawAmount: w,
              note,
            });
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save");
          }
        });
      }}
    >
      <p className="text-[12px] text-[var(--ink-2)]">
        Cost becomes cost − (withdraw − P/L) in THB. Reduce positions so mark
        falls by about the withdraw. Cron updates value. {accountName} stays the
        source account.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Date">
          <Input
            type="date"
            required
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </Field>
        <Field label="Currency">
          <CurrencySelect
            currencies={currencies}
            value={currencyId}
            onChange={setCurrencyId}
          />
        </Field>
        <Field label={`Withdraw (${currency?.symbol ?? "native"})`}>
          <Input
            type="number"
            step="any"
            min="0"
            required
            placeholder="2071.70"
            value={withdraw}
            onChange={(e) => setWithdraw(e.target.value)}
          />
        </Field>
        <Field label={`P/L portion (${currency?.symbol ?? "native"})`}>
          <Input
            type="number"
            step="any"
            required
            placeholder="726.19"
            value={pnl}
            onChange={(e) => setPnl(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Note">
        <Input
          type="text"
          placeholder="To savings, taking 20k profit"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      {preview && !preview.invalid && (
        <p className="text-[12px] text-[var(--ink-2)]">
          Cost <Sensitive>{thb(currentCost)}</Sensitive>
          {" → "}
          <Sensitive>{thb(preview.nextCost)}</Sensitive>
          {" ("}
          <Sensitive>{thb(preview.costDelta, { sign: true })}</Sensitive>
          {"). Account P/L falls by "}
          <Sensitive>
            {thb(preview.pnlThb, { sign: true, decimals: 2 })}
          </Sensitive>
          {preview.nextCost > 0
            ? ` · remaining return ${pct(preview.nextPct)}`
            : ""}
          .
        </p>
      )}
      {(error || preview?.invalid) && (
        <p className="text-[12px] text-[var(--accent-neg)]">
          {error ?? preview?.invalid}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Record withdrawal"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function BookLeftoverButton({
  accountId,
  leftover,
  thbCurrencyId,
}: {
  accountId: number;
  leftover: number;
  thbCurrencyId: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              if (!thbCurrencyId) {
                throw new Error("THB currency is missing");
              }
              await createInAccountPnlEvent({
                accountId,
                occurredOn: todayIso(),
                currencyId: thbCurrencyId,
                pnl: leftover,
                note: "History before logging",
                undocumented: true,
              });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save");
            }
          });
        }}
      >
        {pending ? (
          "Booking…"
        ) : (
          <>
            Book leftover <Sensitive>{thb(leftover, { sign: true })}</Sensitive>
          </>
        )}
      </Button>
      {error && (
        <span className="text-[12px] text-[var(--accent-neg)]">{error}</span>
      )}
    </div>
  );
}

/** Two-step: the first click arms, the second deletes. A withdrawal row also
 *  moves cost basis, so a stray click must not be enough. */
function DeleteEventButton({
  eventId,
  kind,
}: {
  eventId: number;
  kind: PnlEvent["kind"];
}) {
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const label =
    kind === "withdrawn"
      ? "Delete withdrawal and restore cost"
      : "Delete log row";

  if (armed) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          className="h-7 px-2 text-[11px] text-[var(--accent-neg)]"
          onClick={() => {
            startTransition(async () => {
              await deletePnlEvent(eventId);
              setArmed(false);
            });
          }}
        >
          {pending ? "Deleting…" : "Confirm"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          className="h-7 px-2 text-[11px]"
          onClick={() => setArmed(false)}
        >
          Cancel
        </Button>
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setArmed(true)}
      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius)] text-[var(--ink-3)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--accent-neg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]"
    >
      <Trash2 size={13} strokeWidth={2} />
    </button>
  );
}
