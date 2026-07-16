"use client";

import { useState } from "react";
import lettersData from "@/data/letters.json";
import { useStore } from "@/lib/store";
import { TAXONOMY, BY_SLUG } from "@/lib/taxonomy";
import type { CategorySlug, Letter } from "@/lib/types";

const LETTERS = lettersData as Letter[];

export default function ReviewQueue() {
  const { state, dispatch } = useStore();
  const queue = state.reviewQueue;

  if (queue.length === 0) {
    return (
      <div className="max-w-[520px] mx-auto py-20 text-center">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full border border-line-strong flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-line-strong" />
        </div>
        <h2 className="text-[15px] font-medium text-ink">Nothing waiting on a human</h2>
        <p className="mt-1.5 text-[12.5px] text-muted leading-relaxed">
          High-stakes letters (denials, awards, deadlines, good-cause, overpayments), low-confidence
          classifications, and no-match letters land here before any action is taken. Process some
          mail in the Inbox to populate the queue.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[820px] mx-auto p-6 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted">
          Review queue · {queue.length}
        </h2>
        <span className="text-[11px] text-faint">the gate diverted these before routing</span>
      </div>
      {queue.map((item) => {
        const letter = LETTERS.find((l) => l.id === item.letterId)!;
        return (
          <ReviewCard
            key={item.letterId}
            letter={letter}
            reason={item.reason}
            tentative={item.classify.category}
            confidence={item.classify.confidence}
            claimant={item.extract.claimantName}
            matched={item.match.matched ? item.match.clientName : null}
            onApprove={() => dispatch({ type: "approve", letterId: item.letterId, letter })}
            onOverride={(cat) => dispatch({ type: "override", letterId: item.letterId, letter, category: cat })}
            onReject={() => dispatch({ type: "reject", letterId: item.letterId })}
          />
        );
      })}
    </div>
  );
}

function ReviewCard({
  letter,
  reason,
  tentative,
  confidence,
  claimant,
  matched,
  onApprove,
  onOverride,
  onReject,
}: {
  letter: Letter;
  reason: string;
  tentative: CategorySlug;
  confidence: number;
  claimant: string | null;
  matched: string | null;
  onApprove: () => void;
  onOverride: (cat: CategorySlug) => void;
  onReject: () => void;
}) {
  const [cat, setCat] = useState<CategorySlug>(tentative);
  const changed = cat !== tentative;

  return (
    <div className="fade-up rounded-lg border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-[10.5px] text-muted">{letter.scanFilename}</div>
          <div className="mt-0.5 text-[13px] text-ink">
            {claimant ?? "unknown claimant"}
            {matched && <span className="text-muted"> · matched {matched}</span>}
          </div>
        </div>
        <span className="shrink-0 rounded bg-gate-soft text-gate px-2 py-0.5 font-mono text-[10px]">
          held
        </span>
      </div>

      <p className="mt-2 text-[11.5px] text-muted leading-snug">{reason}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-[10.5px] uppercase tracking-wider text-faint">Category</span>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as CategorySlug)}
            className="rounded border border-line-strong bg-white px-2 h-8 text-[12px] text-ink focus:outline-none focus:border-accent"
          >
            {TAXONOMY.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
                {c.slug === tentative ? "  (suggested)" : ""}
              </option>
            ))}
          </select>
        </label>
        <span className="font-mono text-[10px] text-faint">
          model said {BY_SLUG[tentative].label} @ {Math.round(confidence * 100)}%
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        {changed ? (
          <button
            onClick={() => onOverride(cat)}
            className="rounded-md bg-accent px-3 h-8 text-[12px] font-medium text-white transition-transform active:translate-y-px"
          >
            Override to {BY_SLUG[cat].label}
          </button>
        ) : (
          <button
            onClick={onApprove}
            className="rounded-md bg-ok px-3 h-8 text-[12px] font-medium text-white transition-transform active:translate-y-px"
          >
            Approve &amp; route
          </button>
        )}
        <button
          onClick={onReject}
          className="rounded-md border border-line-strong bg-white px-3 h-8 text-[12px] text-muted hover:text-ink transition-transform active:translate-y-px"
        >
          Send to manual triage
        </button>
      </div>
    </div>
  );
}
