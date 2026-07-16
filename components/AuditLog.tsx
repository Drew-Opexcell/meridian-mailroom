"use client";

import { AUDIT_COLUMNS, toCsv } from "@/lib/audit";
import { useStore } from "@/lib/store";

export default function AuditLog() {
  const { state } = useStore();
  const rows = state.auditRows;

  function download() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meridian-mailroom-audit.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-[520px] mx-auto py-20 text-center">
        <h2 className="text-[15px] font-medium text-ink">No runs logged yet</h2>
        <p className="mt-1.5 text-[12.5px] text-muted leading-relaxed">
          Every processed letter and every review decision appends one immutable row here, the same
          22-column trail the production system writes for reconciliation and cost tracking. Token
          counts and durations are real.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted">
          Audit log · {rows.length} {rows.length === 1 ? "row" : "rows"}
        </h2>
        <button
          onClick={download}
          className="font-mono text-[11px] text-accent hover:underline"
        >
          export CSV
        </button>
      </div>
      <div className="overflow-x-auto border border-line rounded-lg bg-panel">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-bg">
              {AUDIT_COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className="sticky top-0 bg-bg text-left font-medium text-muted uppercase tracking-wide text-[9.5px] px-2.5 py-2 border-b border-line whitespace-nowrap"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.runId}-${i}`} className="border-b border-line last:border-0 hover:bg-bg/60">
                {AUDIT_COLUMNS.map((c) => {
                  const v = r[c.key];
                  return (
                    <td
                      key={c.key}
                      className={`px-2.5 py-1.5 whitespace-nowrap ${
                        c.mono ? "font-mono text-[10px] text-muted" : "text-ink"
                      }`}
                    >
                      {v === "" || v === null || v === undefined ? (
                        <span className="text-faint">·</span>
                      ) : (
                        String(v)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
