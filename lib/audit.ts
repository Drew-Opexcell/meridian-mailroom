import { BY_SLUG } from "./taxonomy";
import type {
  AuditRow,
  ClassifyResult,
  ExtractResult,
  GateResult,
  MatchResult,
  RouteResult,
  StageEvent,
} from "./types";

export function buildAuditRow(
  events: StageEvent[],
  reviewDecision: string,
  routeOverride?: RouteResult,
): AuditRow {
  const done = events.find((e) => e.stage === "done");
  const cls = payload<ClassifyResult>(events, "classify");
  const ext = payload<ExtractResult>(events, "extract");
  const match = payload<MatchResult>(events, "match");
  const gate = payload<GateResult>(events, "gate");
  const route = routeOverride ?? payload<RouteResult>(events, "route");

  const first = events[0];
  const cat = cls ? BY_SLUG[cls.category] : undefined;
  const tokensIn = sum(events, (e) => e.tokens?.input);
  const tokensOut = sum(events, (e) => e.tokens?.output);
  const durationMs = sum(events, (e) => (e.status === "complete" ? e.durationMs : undefined));

  return {
    ts: done?.ts ?? first?.ts ?? new Date().toISOString(),
    runId: first?.runId ?? "",
    mode: first?.mode ?? "",
    letterId: first?.letterId ?? "",
    sourceFile: events.find((e) => e.stage === "ingest")?.message ?? "",
    category: cat?.label ?? "",
    confidence: cls ? round(cls.confidence) : "",
    claimant: ext?.claimantName ?? "",
    ssnLast4: ext?.ssnLast4 ?? "",
    docDate: ext?.docDate ?? "",
    matchedClient: match?.clientName ?? "",
    matterId: match?.matterId ?? "",
    matchScore: match?.score ?? "",
    matchMethod: match?.method ?? "",
    gate: gate?.divert ? "review" : "auto",
    reviewDecision,
    renamedTo: route?.renamedTo ?? "",
    routedFolder: route?.folder ?? "",
    followUp: route?.followUp ?? "",
    tokensIn: tokensIn || "",
    tokensOut: tokensOut || "",
    durationMs: durationMs || "",
  };
}

export const AUDIT_COLUMNS: { key: keyof AuditRow; label: string; mono?: boolean }[] = [
  { key: "ts", label: "Timestamp", mono: true },
  { key: "mode", label: "Mode" },
  { key: "letterId", label: "Doc", mono: true },
  { key: "sourceFile", label: "Source file", mono: true },
  { key: "category", label: "Category" },
  { key: "confidence", label: "Conf.", mono: true },
  { key: "claimant", label: "Claimant" },
  { key: "ssnLast4", label: "ID4", mono: true },
  { key: "docDate", label: "Doc date", mono: true },
  { key: "matchedClient", label: "Matched client" },
  { key: "matterId", label: "Matter", mono: true },
  { key: "matchScore", label: "Score", mono: true },
  { key: "matchMethod", label: "Method" },
  { key: "gate", label: "Gate" },
  { key: "reviewDecision", label: "Review" },
  { key: "renamedTo", label: "Renamed to", mono: true },
  { key: "routedFolder", label: "Folder" },
  { key: "followUp", label: "Follow-up" },
  { key: "tokensIn", label: "Tok in", mono: true },
  { key: "tokensOut", label: "Tok out", mono: true },
  { key: "durationMs", label: "ms", mono: true },
];

export function toCsv(rows: AuditRow[]): string {
  const header = AUDIT_COLUMNS.map((c) => c.label).join(",");
  const lines = rows.map((r) =>
    AUDIT_COLUMNS.map((c) => csvCell(String(r[c.key] ?? ""))).join(","),
  );
  return [header, ...lines].join("\n");
}

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function payload<T>(events: StageEvent[], stage: string): T | undefined {
  return events.find((e) => e.stage === stage && e.status === "complete")?.payload as T | undefined;
}
function sum(events: StageEvent[], pick: (e: StageEvent) => number | undefined): number {
  return events.reduce((a, e) => a + (pick(e) ?? 0), 0);
}
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
