import type { Client, ExtractResult, MatchResult } from "./types";

// optimal string alignment variant, an adjacent swap counts as one edit
export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // d[i][j] = distance between a[0..i) and b[0..j)
  const d: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\.?\b/g, " ")
    .replace(/[^a-z\s-]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  const dist = damerauLevenshtein(na, nb);
  const longest = Math.max(na.length, nb.length);
  return 1 - dist / longest;
}

const EXACT_THRESHOLD = 0.999;
const FUZZY_THRESHOLD = 0.8;

// best name similarity wins; if several clients are close, the letter's DOB breaks the tie
export function matchClient(
  extract: ExtractResult,
  clients: Client[],
): MatchResult {
  const claimant = extract.claimantName?.trim();
  if (!claimant) {
    return { matched: false, clientId: null, matterId: null, clientName: null, method: "none", distance: null, score: null, note: "no claimant name extracted" };
  }

  const scored = clients
    .map((c) => {
      const full = `${c.firstName} ${c.lastName}`;
      const sim = nameSimilarity(claimant, full);
      const dist = damerauLevenshtein(normalizeName(claimant), normalizeName(full));
      return { client: c, sim, dist };
    })
    .sort((x, y) => y.sim - x.sim);

  const best = scored[0];
  if (!best || best.sim < FUZZY_THRESHOLD) {
    return { matched: false, clientId: null, matterId: null, clientName: null, method: "none", distance: best?.dist ?? null, score: best ? round(best.sim) : null, note: "no client above match threshold" };
  }

  // one edit on a ~14 char name is ~0.07, so the band is a bit wider than that
  const contenders = scored.filter((s) => best.sim - s.sim <= 0.1);
  let chosen = best;
  let usedDob = false;
  if (contenders.length > 1 && extract.dob) {
    const dobHit = contenders.find((s) => s.client.dob === extract.dob);
    if (dobHit) {
      chosen = dobHit;
      usedDob = true;
    }
  }

  const method =
    chosen.sim >= EXACT_THRESHOLD ? "exact" : usedDob ? "fuzzy+dob" : "fuzzy";

  return {
    matched: true,
    clientId: chosen.client.id,
    matterId: chosen.client.matterId,
    clientName: `${chosen.client.firstName} ${chosen.client.lastName}`,
    method,
    distance: chosen.dist,
    score: round(chosen.sim),
    note:
      contenders.length > 1
        ? usedDob
          ? `${contenders.length} name candidates; DOB broke the tie`
          : `${contenders.length} close candidates; picked highest similarity`
        : undefined,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
