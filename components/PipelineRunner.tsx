"use client";

import { BY_SLUG } from "@/lib/taxonomy";
import type {
  ClassifyResult,
  ExtractResult,
  GateResult,
  MatchResult,
  RouteResult,
  StageEvent,
} from "@/lib/types";

const STAGES: { key: string; label: string }[] = [
  { key: "classify", label: "Classify" },
  { key: "extract", label: "Extract" },
  { key: "match", label: "Match" },
  { key: "gate", label: "Gate" },
  { key: "route", label: "Route" },
];

type StageStatus = "idle" | "running" | "done" | "skipped";

function statusOf(events: StageEvent[], key: string): StageStatus {
  const done = events.some((e) => e.stage === key && e.status === "complete");
  const started = events.some((e) => e.stage === key && e.status === "start");
  if (done) return "done";
  if (started) return "running";
  const diverted = events.find((e) => e.stage === "gate" && e.status === "complete")
    ?.payload as GateResult | undefined;
  if (key === "route" && diverted?.divert) return "skipped";
  return "idle";
}

function completed<T>(events: StageEvent[], key: string): T | undefined {
  return events.find((e) => e.stage === key && e.status === "complete")?.payload as T | undefined;
}

export default function PipelineRunner({ events }: { events: StageEvent[] }) {
  const err = events.find((e) => e.stage === "error");
  return (
    <div>
      <ol className="space-y-px">
        {STAGES.map((s) => (
          <StageRow key={s.key} stageKey={s.key} label={s.label} events={events} />
        ))}
      </ol>
      {err && (
        <div className="mt-3 text-[12px] text-warn bg-warn-soft border border-warn/20 rounded px-3 py-2">
          {err.message ?? "Pipeline error."}
        </div>
      )}
    </div>
  );
}

function StageRow({
  stageKey,
  label,
  events,
}: {
  stageKey: string;
  label: string;
  events: StageEvent[];
}) {
  const status = statusOf(events, stageKey);
  return (
    <li className="flex gap-3 py-2 border-b border-line last:border-0">
      <StageDot status={status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span
            className={`text-[12px] font-medium tracking-tight ${
              status === "idle" ? "text-faint" : status === "skipped" ? "text-faint line-through" : "text-ink"
            }`}
          >
            {label}
          </span>
          <StageMeta events={events} stageKey={stageKey} status={status} />
        </div>
        {status === "done" && <StageDetail events={events} stageKey={stageKey} />}
      </div>
    </li>
  );
}

function StageDot({ status }: { status: StageStatus }) {
  const base = "mt-1 h-2.5 w-2.5 rounded-full shrink-0";
  if (status === "running")
    return <span className={`${base} bg-accent pulse-dot`} aria-label="running" />;
  if (status === "done") return <span className={`${base} bg-ok`} aria-label="done" />;
  if (status === "skipped")
    return <span className={`${base} border border-line-strong bg-transparent`} aria-label="skipped" />;
  return <span className={`${base} border border-line-strong bg-transparent`} aria-label="idle" />;
}

function StageMeta({
  events,
  stageKey,
  status,
}: {
  events: StageEvent[];
  stageKey: string;
  status: StageStatus;
}) {
  if (status === "running") return <span className="font-mono text-[10px] text-accent">running</span>;
  const ev = events.find((e) => e.stage === stageKey && e.status === "complete");
  if (!ev) return status === "skipped" ? <span className="font-mono text-[10px] text-faint">skipped</span> : null;
  const parts: string[] = [];
  if (ev.tokens) parts.push(`${ev.tokens.input + ev.tokens.output} tok`);
  if (ev.durationMs) parts.push(`${ev.durationMs} ms`);
  return <span className="font-mono text-[10px] text-faint">{parts.join(" · ")}</span>;
}

function StageDetail({ events, stageKey }: { events: StageEvent[]; stageKey: string }) {
  if (stageKey === "classify") {
    const c = completed<ClassifyResult>(events, "classify");
    if (!c) return null;
    return (
      <div className="mt-1.5 fade-up">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-ink">{BY_SLUG[c.category].label}</span>
          <ConfidenceBar value={c.confidence} />
        </div>
        <p className="mt-1 text-[11px] text-muted leading-snug">{c.rationale}</p>
      </div>
    );
  }
  if (stageKey === "extract") {
    const e = completed<ExtractResult>(events, "extract");
    if (!e) return null;
    return (
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 fade-up">
        <Field label="Claimant" value={e.claimantName} mono />
        <Field label="DOB" value={e.dob} mono />
        <Field label="ID (last 4)" value={e.ssnLast4} mono />
        <Field label="Doc date" value={e.docDate} mono />
      </dl>
    );
  }
  if (stageKey === "match") {
    const m = completed<MatchResult>(events, "match");
    if (!m) return null;
    return (
      <div className="mt-1.5 fade-up text-[11.5px]">
        {m.matched ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-ink">{m.clientName}</span>
            <span className="font-mono text-[10px] text-muted">{m.matterId}</span>
            <Tag>{m.method}</Tag>
            {m.distance !== null && (
              <span className="font-mono text-[10px] text-muted">dist {m.distance}</span>
            )}
            {m.score !== null && (
              <span className="font-mono text-[10px] text-muted">score {m.score}</span>
            )}
          </div>
        ) : (
          <span className="text-warn">No client match. {m.note}</span>
        )}
        {m.note && m.matched && <p className="mt-0.5 text-[10.5px] text-faint">{m.note}</p>}
      </div>
    );
  }
  if (stageKey === "gate") {
    const g = completed<GateResult>(events, "gate");
    if (!g) return null;
    return (
      <div className="mt-1.5 fade-up text-[11.5px]">
        {g.divert ? (
          <div className="flex items-start gap-1.5">
            <Tag tone="gate">held for review</Tag>
            <span className="text-muted leading-snug">{g.reason}</span>
          </div>
        ) : (
          <Tag tone="ok">cleared to auto-route</Tag>
        )}
      </div>
    );
  }
  if (stageKey === "route") {
    const r = completed<RouteResult>(events, "route");
    if (!r) return null;
    return (
      <div className="mt-1.5 fade-up text-[11.5px] space-y-0.5">
        <div className="font-mono text-[11px] text-ink break-all">{r.renamedTo}</div>
        <div className="text-muted">
          into <span className="text-ink">{r.folder}</span>, copy to{" "}
          <span className="text-ink">{r.archivedTo}</span>
        </div>
        <div className="text-muted">follow-up: {r.followUp}</div>
      </div>
    );
  }
  return null;
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <>
      <dt className="text-[10.5px] text-faint">{label}</dt>
      <dd className={`text-[11.5px] ${value ? "text-ink" : "text-faint"} ${mono ? "font-mono" : ""}`}>
        {value ?? "null"}
      </dd>
    </>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const low = value < 0.7;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-16 rounded-full bg-line overflow-hidden">
        <span
          className={`block h-full ${low ? "bg-warn" : "bg-ok"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="font-mono text-[10px] text-muted">{pct}%</span>
    </span>
  );
}

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "gate" }) {
  const map = {
    neutral: "bg-accent-soft text-accent",
    ok: "bg-ok-soft text-ok",
    gate: "bg-gate-soft text-gate",
  } as const;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] ${map[tone]}`}>
      {children}
    </span>
  );
}
