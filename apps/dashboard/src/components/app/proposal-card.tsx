"use client";

import { Check, PencilLine, X } from "lucide-react";
import { useState } from "react";

import { Sensitive } from "@/components/app/sensitive";
import { Button } from "@/components/ui/button";
import {
  formatChangeValue,
  type ProposalPreviewRow,
  type ProposalStatus,
} from "@/lib/ai/proposal-ops";
import { cn } from "@/lib/utils";

export interface ProposalCardModel {
  id: number;
  status: ProposalStatus;
  summary: string;
  preview: ProposalPreviewRow[];
  userNote?: string | null;
}

const STATUS_LABEL: Record<ProposalStatus, string> = {
  pending: "Needs approval",
  applied: "Applied",
  rejected: "Rejected",
  revision_requested: "Changes requested",
};

export function ProposalCard({
  proposal,
  busy = false,
  chatBusy = false,
  onApprove,
  onReject,
  onRequestChanges,
}: {
  proposal: ProposalCardModel;
  busy?: boolean;
  chatBusy?: boolean;
  onApprove?: () => void;
  onReject?: (note: string) => void;
  onRequestChanges?: (note: string) => void;
}) {
  const [mode, setMode] = useState<"idle" | "reject" | "revise">("idle");
  const [note, setNote] = useState("");
  const pending = proposal.status === "pending";
  const canAct = pending && Boolean(onApprove || onReject || onRequestChanges);
  const followUpDisabled = busy || chatBusy;

  const submitReject = () => {
    onReject?.(note.trim());
    setMode("idle");
    setNote("");
  };

  const submitRevise = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    onRequestChanges?.(trimmed);
    setMode("idle");
    setNote("");
  };

  return (
    <section
      className={cn(
        "mt-2 overflow-hidden rounded-lg border bg-[var(--surface)] text-[var(--ink)]",
        proposal.status === "pending" && "border-[var(--accent-pri)]",
        proposal.status === "applied" && "border-[var(--accent-pos)]",
        proposal.status === "rejected" && "border-[var(--accent-neg)]",
        proposal.status === "revision_requested" && "border-[var(--hairline)]",
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] px-3 py-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium tracking-wide text-[var(--ink-3)] uppercase">
            Proposed change #{proposal.id}
          </div>
          <p className="mt-0.5 text-sm font-medium text-pretty">
            {proposal.summary}
          </p>
        </div>
        <span
          className={cn(
            "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
            proposal.status === "pending" &&
              "bg-[var(--accent-soft)] text-[var(--accent-pri)]",
            proposal.status === "applied" &&
              "bg-[color-mix(in_oklch,var(--accent-pos)_16%,var(--surface))] text-[var(--accent-pos)]",
            proposal.status === "rejected" &&
              "bg-[color-mix(in_oklch,var(--accent-neg)_16%,var(--surface))] text-[var(--accent-neg)]",
            proposal.status === "revision_requested" &&
              "bg-[var(--surface-2)] text-[var(--ink-2)]",
          )}
        >
          {STATUS_LABEL[proposal.status]}
        </span>
      </header>

      <div className="px-3 py-2">
        <div className="flex flex-col gap-2">
          {proposal.preview.map((row, index) => (
            <div
              key={`${row.op}-${row.target}-${index}`}
              className="rounded-md bg-[var(--surface-2)] px-2 py-1.5"
            >
              <div className="text-[11px] font-medium text-[var(--ink-2)]">
                {row.label}
              </div>
              <div className="truncate text-xs text-[var(--ink)]">
                {row.target}
              </div>
              <dl className="mt-1 space-y-0.5">
                {row.changes.map((change) => (
                  <div
                    key={change.field}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 text-[11px]"
                  >
                    <dt className="truncate text-[var(--ink-3)]">
                      {change.field}
                    </dt>
                    <dd className="num text-right">
                      <Sensitive className="text-[var(--ink-3)]">
                        {formatChangeValue(change.before)}
                      </Sensitive>
                      <span className="mx-1 text-[var(--ink-3)]">→</span>
                      <Sensitive>{formatChangeValue(change.after)}</Sensitive>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        {proposal.userNote && (
          <p className="mt-2 text-[11px] text-[var(--ink-2)]">
            {proposal.status === "rejected" ? "Rejected" : "Requested"}:{" "}
            {proposal.userNote}
          </p>
        )}

        {canAct && mode === "idle" && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {onApprove && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={onApprove}
              >
                <Check size={14} />
                Approve change
              </Button>
            )}
            {onReject && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setMode("reject");
                  setNote("");
                }}
              >
                <X size={14} />
                Reject
              </Button>
            )}
            {onRequestChanges && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={followUpDisabled}
                onClick={() => {
                  setMode("revise");
                  setNote("");
                }}
              >
                <PencilLine size={14} />
                Request changes
              </Button>
            )}
          </div>
        )}

        {canAct && mode !== "idle" && (
          <form
            className="mt-2 flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (mode === "reject") submitReject();
              else submitRevise();
            }}
          >
            <label className="text-[11px] text-[var(--ink-2)]">
              {mode === "reject"
                ? "Reason (optional)"
                : "What should be different?"}
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                autoFocus
                className="mt-1 max-h-28 min-h-14 w-full resize-none rounded-md border border-[var(--hairline)] bg-[var(--surface-2)] px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[var(--accent-pri)]"
                placeholder={
                  mode === "reject"
                    ? "Why this should not be applied"
                    : "Describe the correction"
                }
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="submit"
                variant={mode === "reject" ? "outline" : "primary"}
                size="sm"
                disabled={
                  followUpDisabled || (mode === "revise" && !note.trim())
                }
              >
                {mode === "reject" ? "Reject proposal" : "Send request"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setMode("idle");
                  setNote("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
