"use client";

import {
  Bot,
  Building2,
  CreditCard,
  Home,
  LineChart,
  PieChart,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/investments", label: "Investments", icon: LineChart },
  { href: "/real-estate", label: "Real Estate", icon: Building2 },
  { href: "/allocation", label: "Allocation", icon: PieChart },
  { href: "/banks", label: "Banks", icon: Wallet },
  { href: "/credit", label: "Credit & Loans", icon: CreditCard },
] as const;

const isActive = (current: string, href: string) =>
  href === "/"
    ? current === "/"
    : current === href || current.startsWith(href + "/");

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 hidden h-screen flex-col gap-6 border-r border-[var(--hairline)] bg-[var(--surface-2)] p-[18px_14px] md:flex md:w-[240px]">
      <div className="flex items-center gap-2.5 px-1.5 py-1">
        <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[var(--radius)] bg-[var(--ink)] text-[var(--bg)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
          <LineChart size={16} strokeWidth={2} />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-[-0.01em]">
            Portfolio
          </div>
          <div className="text-[11px] text-[var(--ink-3)]">Tracking</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]",
                active
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_2px_rgba(15,23,42,0.06)] [[data-theme='dark']_&]:shadow-[inset_0_0_0_1px_var(--hairline)]"
                  : "text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)]",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-md",
                  active ? "bg-[var(--accent-soft)]" : "bg-transparent",
                )}
              >
                <Icon size={16} strokeWidth={1.8} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface)] p-3">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--ink-2)]">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-pri)]">
            <Bot size={13} strokeWidth={2} />
          </span>
          Daily snapshot
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--ink-3)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-pos)]" />
          <span>Cron is the source of truth</span>
        </div>
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-2 overflow-x-auto border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-3 md:hidden">
      <div className="mr-2 grid h-8 w-8 flex-shrink-0 place-items-center rounded-[var(--radius)] bg-[var(--ink)] text-[var(--bg)]">
        <LineChart size={16} strokeWidth={2} />
      </div>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]",
              active
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                : "text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)]",
            )}
          >
            <Icon size={18} strokeWidth={1.6} />
          </Link>
        );
      })}
    </nav>
  );
}
