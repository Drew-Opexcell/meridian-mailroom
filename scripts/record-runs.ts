// dev only: re-records data/recorded-runs.json with live model calls
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import letters from "../data/letters.json" with { type: "json" };
import { runPipeline } from "../lib/pipeline";
import type { Letter, StageEvent } from "../lib/types";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Set ANTHROPIC_API_KEY to record runs.");
    process.exit(1);
  }
  const out: Record<string, StageEvent[]> = {};
  const capturedAt = new Date().toISOString();

  for (const letter of letters as Letter[]) {
    process.stdout.write(`recording ${letter.id} (${letter.scanFilename})... `);
    const events: StageEvent[] = [];
    try {
      for await (const ev of runPipeline(letter)) {
        events.push({ ...ev, mode: "recorded" });
      }
      const done = events[events.length - 1];
      console.log(done?.message ?? "done");
    } catch (err) {
      console.log("ERROR", err instanceof Error ? err.message : err);
    }
    out[letter.id] = events;
  }

  const payload = { capturedAt, runs: out };
  const dest = join(process.cwd(), "data", "recorded-runs.json");
  writeFileSync(dest, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`\nwrote ${dest}`);
}

main();
