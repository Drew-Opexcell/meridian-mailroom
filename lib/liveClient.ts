import type { StageEvent } from "./types";

export async function* liveRun(letterId: string): AsyncGenerator<StageEvent> {
  const res = await fetch("/api/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ letterId }),
  });

  if (!res.ok || !res.body) {
    let msg = `Live run failed (${res.status}).`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      // keep default
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) yield JSON.parse(line) as StageEvent;
    }
  }
  const tail = buffer.trim();
  if (tail) yield JSON.parse(tail) as StageEvent;
}

export interface LiveStatus {
  liveEnabled: boolean;
  remainingToday: number;
  dailyCap: number;
}

export async function fetchStatus(): Promise<LiveStatus> {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    return (await res.json()) as LiveStatus;
  } catch {
    return { liveEnabled: false, remainingToday: 0, dailyCap: 0 };
  }
}
