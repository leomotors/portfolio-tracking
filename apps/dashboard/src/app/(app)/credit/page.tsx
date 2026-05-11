export const dynamic = "force-dynamic";

import { Kpi, KpiGrid } from "@/components/app/kpi";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCreditCards, getPersonalLoans } from "@/lib/db/queries";
import { CARD_BG } from "@/lib/portfolio/colors";
import { num, ordinal, thb } from "@/lib/portfolio/format";
import { cn } from "@/lib/utils";

export default async function CreditPage() {
  const [creditCards, personalLoans] = await Promise.all([
    getCreditCards(),
    getPersonalLoans(),
  ]);

  const totalLimit = creditCards.reduce((s, c) => s + c.creditLimit, 0);
  const loanLimit = personalLoans.reduce((s, l) => s + l.creditLimit, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker="Credit & loans"
        title="Cards & loan lines"
        sub="Reference records — usage and balances are not tracked here, only the lines themselves"
      />

      <KpiGrid layout="4up">
        <Kpi label="Credit cards" value={creditCards.length} sub="on file" />
        <Kpi
          label="Total credit limit"
          value={thb(totalLimit)}
          sub="sum of card limits"
        />
        <Kpi label="Loan lines" value={personalLoans.length} sub="on file" />
        <Kpi
          label="Total loan capacity"
          value={thb(loanLimit)}
          sub="sum of loan limits"
        />
      </KpiGrid>

      <h3 className="my-1 text-[13px] font-semibold uppercase tracking-[0.02em] text-[var(--ink-2)]">
        Credit cards
      </h3>

      {creditCards.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-[13px] text-[var(--ink-2)]">
              No credit cards on file.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {creditCards.map((c) => (
            <div
              key={c.id}
              className="relative flex min-h-[180px] flex-col gap-2.5 overflow-hidden rounded-[var(--radius-lg)] p-[18px] text-white"
              style={{
                background: CARD_BG[c.cardType] ?? "oklch(0.30 0.02 250)",
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)",
                }}
              />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[14px] font-semibold">{c.name}</div>
                  <div className="text-[11px] opacity-70">{c.issuedBy}</div>
                </div>
                <div className="text-[10px] uppercase tracking-[0.1em] opacity-60">
                  {c.cardType.replace("_", " ")}
                </div>
              </div>
              <div className="num my-1 text-[13px] tracking-[0.05em] opacity-85">
                {c.cardNo}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.06em] opacity-60">
                    Limit
                  </div>
                  <div className="num text-[16px] font-medium">
                    {thb(c.creditLimit)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.06em] opacity-60">
                    Statement
                  </div>
                  <div className="num text-[16px] font-medium">
                    {ordinal(c.statementDate)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] opacity-70">
                <span>{c.interestFreePeriod} day grace</span>
                <span>·</span>
                <span className="num">{num(c.interestRate, 1)}% APR</span>
                <span>·</span>
                <span>since {new Date(c.openedAt).getFullYear()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="my-1 text-[13px] font-semibold uppercase tracking-[0.02em] text-[var(--ink-2)]">
        Personal loans
      </h3>

      <Card>
        {personalLoans.length === 0 ? (
          <CardContent>
            <p className="text-[13px] text-[var(--ink-2)]">
              No personal loans on file.
            </p>
          </CardContent>
        ) : (
          <>
            <CardHeader className="hidden">
              <CardTitle>Personal loans</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Issued by</Th>
                    <Th>Account no.</Th>
                    <Th align="right">Limit</Th>
                    <Th>Opened</Th>
                  </tr>
                </thead>
                <tbody>
                  {personalLoans.map((l) => (
                    <tr key={l.id}>
                      <Td>
                        <span className="text-[13px] font-semibold">
                          {l.name}
                        </span>
                      </Td>
                      <Td>{l.issuedBy}</Td>
                      <Td>
                        <span className="num text-[var(--ink-3)]">
                          {l.accountNo ?? "—"}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="num">{thb(l.creditLimit)}</span>
                      </Td>
                      <Td>
                        <span className="text-[var(--ink-3)]">
                          {new Date(
                            l.openedAt + "T00:00:00",
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                          })}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
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
