"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Sensitive } from "@/components/app/sensitive";
import { readPrivacyMode, usePrivacyHidden } from "@/lib/privacy-mode";

const initialDraft = "";

interface EditableNumberProps {
  value: number;
  onSave: (value: number) => Promise<void> | void;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  ariaLabel?: string;
  /** When false, the figure stays visible in privacy mode (unit prices, APY). */
  sensitive?: boolean;
}

export function EditableNumber({
  value,
  onSave,
  decimals = 0,
  prefix = "฿",
  suffix = "",
  ariaLabel,
  sensitive = true,
}: EditableNumberProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const hidden = usePrivacyHidden();

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (sensitive && hidden) setEditing(false);
  }, [hidden, sensitive]);

  function startEditing() {
    if (sensitive && readPrivacyMode() === "hidden") return;
    setDraft(String(value));
    setEditing(true);
  }

  function commit() {
    const next = parseFloat(draft);
    if (!Number.isFinite(next) || next < 0) {
      setEditing(false);
      return;
    }
    if (next === value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await onSave(next);
      setEditing(false);
    });
  }

  function cancel() {
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={ariaLabel ?? "Edit value"}
        onClick={startEditing}
        data-privacy-edit={sensitive ? true : undefined}
        className="group inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-[var(--hover)] hover:text-[var(--accent-pri)]"
      >
        <span className="num">
          {sensitive ? (
            <Sensitive>
              {prefix}
              {value.toLocaleString("en-US", {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              })}
              {suffix}
            </Sensitive>
          ) : (
            <>
              {prefix}
              {value.toLocaleString("en-US", {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              })}
              {suffix}
            </>
          )}
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
    <span className="inline-flex items-center gap-1">
      <input
        ref={inputRef}
        type="number"
        step="any"
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") cancel();
        }}
        className="num w-[140px] rounded-md border border-[var(--accent-pri)] bg-[var(--surface)] px-2 py-1 text-[var(--ink)]"
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
  );
}
