"use client";

import { CreditCard, Home, LineChart, PieChart, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/investments", label: "Investments", icon: LineChart },
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
    <nav className="sticky top-0 hidden h-screen flex-col gap-7 border-r border-[var(--hairline)] bg-[var(--bg)] p-[22px_16px] md:flex md:w-[240px]">
      <div className="flex items-center gap-2.5 px-1.5">
        <div className="h-[22px] w-[22px] flex-shrink-0 rounded-md bg-[linear-gradient(135deg,var(--accent-pri),var(--accent-pos))]" />
        <div className="text-[15px] font-semibold tracking-[-0.01em]">
          Portfolio
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_0_var(--hairline)] [[data-theme='dark']_&]:shadow-[inset_0_0_0_1px_var(--hairline)]"
                  : "text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)]",
              )}
            >
              <Icon size={18} strokeWidth={1.6} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 px-1.5 text-[11px] text-[var(--ink-3)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-pos)]" />
        <span>Cron · daily snapshot</span>
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-2 overflow-x-auto border-b border-[var(--hairline)] bg-[var(--bg)] px-4 py-3 md:hidden">
      <div className="mr-2 h-[22px] w-[22px] flex-shrink-0 rounded-md bg-[linear-gradient(135deg,var(--accent-pri),var(--accent-pos))]" />
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md",
              active
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_0_var(--hairline)]"
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
