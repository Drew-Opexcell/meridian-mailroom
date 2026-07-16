import clientsData from "@/data/clients.json";
import { classify, extract } from "./llm";
import { matchClient } from "./fuzzy";
import { routeLetter } from "./router";
import { BY_SLUG, CONFIDENCE_FLOOR } from "./taxonomy";
import type {
  Client,
  GateResult,
  Letter,
  StageEvent,
} from "./types";

const CLIENTS = clientsData as Client[];

export async function* runPipeline(letter: Letter): AsyncGenerator<StageEvent> {
  const runId = `run_${letter.id}_${Date.now().toString(36)}`;
  const base = { runId, letterId: letter.id, mode: "live" as const };

  yield { ...base, stage: "ingest", status: "complete", ts: iso(), message: letter.scanFilename };

  yield { ...base, stage: "classify", status: "start", ts: iso() };
  yield { ...base, stage: "extract", status: "start", ts: iso() };

  const t0 = Date.now();
  const [cls, ext] = await Promise.all([classify(letter), extract(letter)]);
  const half = Math.round((Date.now() - t0) / 2);

  yield { ...base, stage: "classify", status: "complete", payload: cls.result, tokens: cls.tokens, durationMs: half, ts: iso() };
  yield { ...base, stage: "extract", status: "complete", payload: ext.result, tokens: ext.tokens, durationMs: half, ts: iso() };

  yield { ...base, stage: "match", status: "start", ts: iso() };
  const mt0 = Date.now();
  const match = matchClient(ext.result, CLIENTS);
  yield { ...base, stage: "match", status: "complete", payload: match, durationMs: Date.now() - mt0, ts: iso() };

  yield { ...base, stage: "gate", status: "start", ts: iso() };
  const gate = evaluateGate(cls.result.category, cls.result.confidence, match.matched);
  yield { ...base, stage: "gate", status: "complete", payload: gate, ts: iso() };

  if (gate.divert) {
    yield { ...base, stage: "done", status: "complete", ts: iso(), message: "diverted to review" };
    return;
  }

  yield { ...base, stage: "route", status: "start", ts: iso() };
  const route = routeLetter(cls.result, ext.result, match, letter.receivedAt);
  yield { ...base, stage: "route", status: "complete", payload: route, ts: iso() };

  yield { ...base, stage: "done", status: "complete", ts: iso(), message: "auto-routed" };
}

export function evaluateGate(
  category: import("./types").CategorySlug,
  confidence: number,
  matched: boolean,
): GateResult {
  const cat = BY_SLUG[category];
  if (cat.reviewGate) {
    return { divert: true, reason: cat.gateReason ?? "high-stakes category held for review" };
  }
  if (confidence < CONFIDENCE_FLOOR) {
    return { divert: true, reason: `classification confidence ${confidence.toFixed(2)} is below the ${CONFIDENCE_FLOOR} floor` };
  }
  if (!matched) {
    return { divert: true, reason: "no client match; a human confirms who this belongs to before filing" };
  }
  return { divert: false, reason: null };
}

function iso(): string {
  return new Date().toISOString();
}
