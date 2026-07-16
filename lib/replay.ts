import recorded from "@/data/recorded-runs.json";
import type { StageEvent } from "./types";

const RUNS = (recorded as { capturedAt: string; runs: Record<string, StageEvent[]> }).runs;
export const CAPTURED_AT = (recorded as { capturedAt: string }).capturedAt;

// model stages wait roughly their captured duration (clamped), the rest a short beat
export async function* replayRun(letterId: string): AsyncGenerator<StageEvent> {
  const events = RUNS[letterId];
  if (!events) return;
  for (const ev of events) {
    if (ev.status === "complete") {
      const d =
        ev.stage === "classify" || ev.stage === "extract"
          ? clamp(ev.durationMs ?? 900, 450, 2600)
          : ev.stage === "match"
            ? 420
            : 260;
      await sleep(d);
    }
    yield ev;
  }
}

export function hasRecording(letterId: string): boolean {
  return Boolean(RUNS[letterId]);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
