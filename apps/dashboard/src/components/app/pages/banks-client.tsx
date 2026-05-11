"use client";

import { useMemo, useState } from "react";

import { AreaChart } from "@/components/app/area-chart";
import { Chip } from "@/components/app/chip";
import { EditableNumber } from "@/components/app/editable-number";
import { PageHeader } from "@/components/app/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateBankBalance } from "@/lib/db/actions";
import {
  type BankAccount,
  type BankDailyPoint,
  type FcdAccount,
} from "@/lib/db/queries";
import { num, thb } from "@/lib/portfolio/format";
import { cn } from "@/lib/utils";

interface BanksClientProps {
  bankAccounts: BankAccount[];
  bankDaily: BankDailyPoint[];
  fcdAccounts: FcdAccount[];
}

export function BanksClient({
  bankAccounts,
  bankDaily,
  fcdAccounts,
}: BanksClientProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    bankAccounts[0]?.id ?? null,
  );
  const total = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker="Cash on hand"
        title="Bank accounts"
        sub={`THB ${thb(total)} tracked · ${fcdAccounts.length} FCD records (balances not tracked)`}
      />

      <Tabs defaultValue="thb" className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="thb">THB · {bankAccounts.length}</TabsTrigger>
          <TabsTrigger value="fcd">FCD · {fcdAccounts.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="thb">
          {bankAccounts.length === 0 ? (
            <Card>
              <CardContent>
                <p className="text-[13px] text-[var(--ink-2)]">
                  No THB accounts yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ThbView
              accounts={bankAccounts}
              daily={bankDaily}
              selectedId={selectedId ?? bankAccounts[0]!.id}
              onSelect={setSelectedId}
            />
          )}
        </TabsContent>

        <TabsContent value="fcd">
          <FcdView accounts={fcdAccounts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ThbView({
  accounts,
  daily,
  selectedId,
  onSelect,
}: {
  accounts: BankAccount[];
  daily: BankDailyPoint[];
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  const acc = accounts.find((a) => a.id === selectedId) ?? accounts[0]!;
  const series = useMemo(
    () =>
      daily
        .filter((d) => d.accountId === acc.id)
        .slice(-180)
        .map((d) => ({ date: d.date, value: d.balance })),
    [daily, acc.id],
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-1.5 lg:sticky lg:top-20">
        {accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={cn(
              "flex flex-col gap-2 rounded-[var(--radius)] border bg-[var(--surface)] p-3.5 text-left transition-colors hover:bg-[var(--surface-2)]",
              a.id === acc.id
                ? "border-[var(--ink)] [[data-theme='dark']_&]:border-[var(--ink-2)]"
                : "border-[var(--hairline)]",
            )}
          >
            <div className="flex items-start justify-between gap-2.5">
              <div>
                <div className="text-[13px] font-semibold">{a.name}</div>
                <div className="num text-[11px] text-[var(--ink-3)]">
                  {a.bank} · {a.accountNo}
                </div>
              </div>
              {a.accountType && (
                <Chip label={a.accountType.replace("_", " ")} />
              )}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="num text-[15px] font-medium">
                {thb(a.currentBalance)}
              </span>
              <span className="num text-[12px] text-[var(--ink-3)]">
                {a.interestRate.toFixed(2)}%
              </span>
            </div>
          </button>
        ))}
      </aside>

      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex flex-wrap items-end justify-between gap-4 px-1 pb-2 pt-1">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
              {acc.bank}
              {acc.branch ? ` · ${acc.branch}` : ""}
            </div>
            <h2 className="m-0 mt-1 text-[24px] font-semibold tracking-[-0.02em]">
              {acc.name}
            </h2>
            <div className="mt-1 text-[12px] text-[var(--ink-3)]">
              {acc.accountNo}
              {acc.openedAt &&
                ` · opened ${new Date(acc.openedAt + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short" })}`}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-[12px] text-[var(--ink-3)]">
              Current balance · click to edit
            </div>
            <div className="num text-[40px] leading-none font-semibold">
              <EditableNumber
                value={acc.currentBalance}
                prefix="฿"
                onSave={(v) => updateBankBalance(acc.id, v)}
                ariaLabel={`Edit balance for ${acc.name}`}
              />
            </div>
            <div className="text-[11px] text-[var(--ink-3)]">
              interest <span className="num">{num(acc.interestRate, 2)}%</span>
            </div>
          </div>
        </div>

        <Card className="px-3 py-2">
          <AreaChart
            data={series}
            height={200}
            accent="var(--accent-pri)"
            formatY={(v) => thb(v)}
            formatX={(p) =>
              new Date(p.date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
            emptyLabel="No balance history yet"
          />
        </Card>

        {acc.remarks?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {acc.remarks.map((r, i) => (
                  <Chip key={i} label={r} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function FcdView({ accounts }: { accounts: FcdAccount[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Foreign currency deposits</CardTitle>
          <CardDescription>
            Account record only — balances are not tracked in this app
          </CardDescription>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr>
              <Th>Account</Th>
              <Th>Bank</Th>
              <Th>Currency</Th>
              <Th align="right">Interest</Th>
              <Th>Opened</Th>
              <Th>Remarks</Th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-[12px] text-[var(--ink-3)]"
                >
                  No FCD accounts on file.
                </td>
              </tr>
            )}
            {accounts.map((a) => (
              <tr key={a.id}>
                <Td>
                  <div className="text-[13px] font-semibold">{a.name}</div>
                  <div className="num text-[11px] text-[var(--ink-3)]">
                    {a.accountNo}
                  </div>
                </Td>
                <Td>
                  {a.bank}
                  {a.branch && (
                    <div className="text-[11px] text-[var(--ink-3)]">
                      {a.branch}
                    </div>
                  )}
                </Td>
                <Td>
                  <span className="num">{a.currency}</span>
                </Td>
                <Td align="right">
                  <span className="num">{num(a.interestRate, 2)}%</span>
                </Td>
                <Td>
                  <span className="text-[var(--ink-3)]">
                    {a.openedAt
                      ? new Date(a.openedAt + "T00:00:00").toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                          },
                        )
                      : "—"}
                  </span>
                </Td>
                <Td>
                  <span className="text-[var(--ink-3)]">
                    {a.remarks?.join(", ") || "—"}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
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
        "border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]",
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
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </td>
  );
}
