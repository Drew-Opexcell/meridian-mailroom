"use client";

import { useState } from "react";
import lettersData from "@/data/letters.json";
import { hasRecording, replayRun } from "@/lib/replay";
import { liveRun } from "@/lib/liveClient";
import { useStore, type LetterState } from "@/lib/store";
import type { Letter } from "@/lib/types";
import LetterDocument from "./LetterDocument";
import PipelineRunner from "./PipelineRunner";

const LETTERS = lettersData as Letter[];

export default function Inbox({ live }: { live: boolean }) {
  const { state, dispatch } = useStore();
  const [selected, setSelected] = useState<string>(LETTERS[0].id);
  const [running, setRunning] = useState(false);

  const letter = LETTERS.find((l) => l.id === selected)!;
  const lState = state.letters[selected];

  async function run(letterId: string) {
    if (running) return;
    setRunning(true);
    dispatch({ type: "start", letterId });
    const target = LETTERS.find((l) => l.id === letterId)!;
    try {
      const source = live ? liveRun(letterId) : replayRun(letterId);
      for await (const event of source) {
        dispatch({ type: "event", letterId, event });
      }
      dispatch({ type: "finish", letterId, letter: target });
    } catch (err) {
      dispatch({
        type: "event",
        letterId,
        event: {
          runId: "err",
          letterId,
          mode: live ? "live" : "recorded",
          stage: "error",
          status: "complete",
          ts: new Date().toISOString(),
          message: err instanceof Error ? err.message : "run failed",
        },
      });
    } finally {
      setRunning(false);
    }
  }

  async function runAll() {
    for (const l of LETTERS) {
      const st = state.letters[l.id]?.status;
      if (st && st !== "unprocessed") continue;
      await run(l.id);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_360px] min-h-[calc(100dvh-112px)]">
      <aside className="border-r border-line bg-panel">
        <div className="flex items-center justify-between px-4 h-11 border-b border-line">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Inbox · {LETTERS.length} scanned
          </span>
          <button
            onClick={runAll}
            disabled={running}
            className="font-mono text-[10px] text-accent hover:underline disabled:text-faint disabled:no-underline"
          >
            run all
          </button>
        </div>
        <ul className="overflow-y-auto max-h-[calc(100dvh-160px)]">
          {LETTERS.map((l) => (
            <MailRow
              key={l.id}
              letter={l}
              active={l.id === selected}
              state={state.letters[l.id]}
              onClick={() => setSelected(l.id)}
            />
          ))}
        </ul>
      </aside>

      <section className="p-6 overflow-y-auto max-h-[calc(100dvh-112px)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[11px] text-muted">{letter.scanFilename}</div>
            <div className="text-[11px] text-faint">
              received {new Date(letter.receivedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </div>
          <button
            onClick={() => run(selected)}
            disabled={running || (lState && lState.status !== "unprocessed")}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3.5 h-9 text-[13px] font-medium text-white transition-transform active:translate-y-px disabled:bg-line-strong disabled:text-white/80"
          >
            {lState && lState.status !== "unprocessed" ? "Processed" : running ? "Running…" : "Process letter"}
          </button>
        </div>
        <div className="max-w-[560px]">
          <LetterDocument letter={letter} />
        </div>
      </section>

      <aside className="border-l border-line bg-panel p-5 overflow-y-auto max-h-[calc(100dvh-112px)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Pipeline</span>
          {!live && hasRecording(selected) && (
            <span className="font-mono text-[9.5px] text-faint">recorded</span>
          )}
        </div>
        {lState ? (
          <PipelineRunner events={lState.events} />
        ) : (
          <EmptyPipeline live={live} />
        )}
      </aside>
    </div>
  );
}

function MailRow({
  letter,
  active,
  state,
  onClick,
}: {
  letter: Letter;
  active: boolean;
  state?: LetterState;
  onClick: () => void;
}) {
  const preview = letter.bodyText.split("\n").find((l) => l.includes("Claimant") || l.includes("Re:")) ?? "";
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-2.5 border-b border-line transition-colors ${
          active ? "bg-accent-soft" : "hover:bg-bg"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] text-muted">{letter.scanFilename}</span>
          <StatusPill status={state?.status} />
        </div>
        <div className="mt-0.5 text-[11.5px] text-ink truncate">{preview || "Bureau correspondence"}</div>
      </button>
    </li>
  );
}

function StatusPill({ status }: { status?: string }) {
  if (!status || status === "unprocessed")
    return <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />;
  const map: Record<string, string> = {
    processing: "text-accent bg-accent-soft",
    routed: "text-ok bg-ok-soft",
    approved: "text-ok bg-ok-soft",
    overridden: "text-ok bg-ok-soft",
    in_review: "text-gate bg-gate-soft",
    rejected: "text-warn bg-warn-soft",
  };
  const label: Record<string, string> = {
    processing: "…",
    routed: "routed",
    approved: "approved",
    overridden: "fixed",
    in_review: "review",
    rejected: "manual",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] ${map[status] ?? "text-muted"}`}>
      {label[status] ?? status}
    </span>
  );
}

function EmptyPipeline({ live }: { live: boolean }) {
  return (
    <div className="text-[12px] text-faint leading-relaxed">
      <p>
        Press <span className="text-muted">Process letter</span> to run this document through the
        pipeline: classify, extract identifiers, fuzzy-match to a client, then gate and route.
      </p>
      <p className="mt-2">
        {live
          ? "Live mode calls Claude for the classify and extract stages."
          : "Recorded mode replays a real captured run, at readable speed."}
      </p>
    </div>
  );
}
