"use client";

import * as HoverCard from "@radix-ui/react-hover-card";
import { Check, Copy } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";

import {
  detectAddressKind,
  parseAccountNo,
  shortenAddress,
  splitHlvSymbol,
} from "@/lib/address";
import { cn } from "@/lib/utils";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const onClick = async (e: MouseEvent) => {
    // React events bubble through portals, e.g. into the account card's onSelect.
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? "Copied" : "Copy address"}
      className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]"
    >
      {copied ? (
        <Check size={13} strokeWidth={2} />
      ) : (
        <Copy size={13} strokeWidth={2} />
      )}
    </button>
  );
}

/** Shortened address; hovering reveals the full value with a copy button. */
export function Address({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <HoverCard.Root openDelay={150} closeDelay={150}>
      <HoverCard.Trigger asChild>
        <span className={cn("num cursor-default", className)}>
          {shortenAddress(value)}
        </span>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="bottom"
          align="start"
          sideOffset={4}
          className="z-50 flex max-w-[min(92vw,420px)] items-center gap-1.5 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface)] py-1 pr-1 pl-2.5 text-[var(--ink)] shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
        >
          <span className="num text-[11px] break-all">{value}</span>
          <CopyButton value={value} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

/** Renders each `accountNo` line, shortening EVM/Solana addresses. */
export function AccountNo({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span className={cn("flex flex-col", className)}>
      {parseAccountNo(value).map(({ label, value: v }, i) => (
        <span key={i}>
          {label && `${label}: `}
          {detectAddressKind(v) ? <Address value={v} /> : v}
        </span>
      ))}
    </span>
  );
}

/** Asset symbol, shortening the address in `HLV:<vaultAddress>`. */
export function AssetSymbol({ symbol }: { symbol: string | null }) {
  if (!symbol) return "—";
  const hlv = splitHlvSymbol(symbol);
  if (!hlv) return symbol;
  return (
    <>
      {hlv.prefix}
      <Address value={hlv.address} />
    </>
  );
}
