"use client";

import { useEffect, useState } from "react";
import { CAPTURED_AT } from "@/lib/replay";
import { fetchStatus } from "@/lib/liveClient";
import { StoreProvider, useStore } from "@/lib/store";
import AuditLog from "./AuditLog";
import Inbox from "./Inbox";
import ReviewQueue from "./ReviewQueue";

type Tab = "inbox" | "review" | "audit";

export default function Dashboard() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<Tab>("inbox");
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<{ liveEnabled: boolean; remainingToday: number; dailyCap: number } | null>(null);

  useEffect(() => {
    fetchStatus().then(setStatus);
  }, []);

  const reviewCount = state.reviewQueue.length;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="border-b border-line bg-panel">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-ink flex items-center justify-center">
              <span className="text-white font-semibold text-[13px] tracking-tight">M</span>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-ink tracking-tight leading-none">
                Meridian Disability Law
              </div>
              <div className="text-[10.5px] text-faint leading-none mt-1">Mailroom · intake automation</div>
            </div>
          </div>
          <ModeControl live={live} setLive={setLive} status={status} />
        </div>

        <nav className="flex items-center gap-1 px-4">
          <TabButton active={tab === "inbox"} onClick={() => setTab("inbox")}>Inbox</TabButton>
          <TabButton active={tab === "review"} onClick={() => setTab("review")}>
            Review queue
            {reviewCount > 0 && (
              <span className="ml-1.5 rounded-full bg-gate-soft text-gate font-mono text-[9px] px-1.5 py-0.5">
                {reviewCount}
              </span>
            )}
          </TabButton>
          <TabButton active={tab === "audit"} onClick={() => setTab("audit")}>
            Audit log
            {state.auditRows.length > 0 && (
              <span className="ml-1.5 font-mono text-[9px] text-faint">{state.auditRows.length}</span>
            )}
          </TabButton>
          <button
            onClick={() => dispatch({ type: "reset" })}
            className="ml-auto mb-1.5 font-mono text-[10px] text-faint hover:text-muted"
          >
            reset demo
          </button>
        </nav>
      </header>

      <div
        className={`px-5 py-1.5 text-[11px] flex items-center gap-2 border-b border-line ${
          live ? "bg-accent-soft text-accent" : "bg-bg text-muted"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-accent pulse-dot" : "bg-ok"}`} />
        {live ? (
          <span>Live mode. Classify and extract call Claude in real time. Runs are capped on this demo instance.</span>
        ) : (
          <span>
            Recorded run. Replaying a real pipeline execution captured {new Date(CAPTURED_AT).toLocaleDateString("en-US", { dateStyle: "medium" })},
            with the real classifications, token counts, and durations.
          </span>
        )}
      </div>

      <main className="flex-1">
        {tab === "inbox" && <Inbox live={live} />}
        {tab === "review" && <ReviewQueue />}
        {tab === "audit" && <AuditLog />}
      </main>

      <footer className="border-t border-line px-5 py-2.5 text-[10.5px] text-faint flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>Synthetic demo. Fictional firm, fictional agency, invented people. No real client data.</span>
        <a
          href="https://github.com/Drew-Opexcell/meridian-mailroom"
          className="text-muted underline underline-offset-2 decoration-line-strong hover:decoration-accent"
        >
          Source &amp; architecture
        </a>
        <a
          href="https://opexcell.com"
          className="text-muted underline underline-offset-2 decoration-line-strong hover:decoration-accent"
        >
          Built by Opexcell
        </a>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 h-9 text-[12.5px] font-medium transition-colors ${
        active ? "text-ink" : "text-faint hover:text-muted"
      }`}
    >
      <span className="inline-flex items-center">{children}</span>
      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-accent rounded-full" />}
    </button>
  );
}

function ModeControl({
  live,
  setLive,
  status,
}: {
  live: boolean;
  setLive: (v: boolean) => void;
  status: { liveEnabled: boolean; remainingToday: number; dailyCap: number } | null;
}) {
  if (!status) return null;
  if (!status.liveEnabled) {
    return (
      <span className="font-mono text-[10px] text-faint" title="This deployment has no API key configured, so only recorded replay is available.">
        recorded-only build
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      {live && (
        <span className="font-mono text-[10px] text-muted" title="Live runs remaining on this instance today. Cap is per instance and resets on redeploy.">
          {status.remainingToday}/{status.dailyCap} left
        </span>
      )}
      <button
        onClick={() => setLive(!live)}
        className="flex items-center gap-2 rounded-full border border-line-strong bg-white px-2.5 h-8 text-[11.5px] text-muted hover:text-ink transition-colors"
        aria-pressed={live}
      >
        <span
          className={`h-3.5 w-3.5 rounded-full transition-colors ${live ? "bg-accent" : "bg-line-strong"}`}
        />
        {live ? "Live (Claude)" : "Recorded"}
      </button>
    </div>
  );
}
