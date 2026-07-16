import { BY_SLUG } from "./taxonomy";
import type { ClassifyResult, ExtractResult, MatchResult, RouteResult } from "./types";

export function routeLetter(
  classify: ClassifyResult,
  extract: ExtractResult,
  match: MatchResult,
  receivedAt: string,
): RouteResult {
  const cat = BY_SLUG[classify.category];
  const last = pickLastName(extract.claimantName, match.clientName);
  const first = pickFirstName(extract.claimantName, match.clientName);
  const matter = match.matterId ?? "UNMATCHED";
  const docDate = (extract.docDate ?? receivedAt).slice(0, 10);

  const renamedTo = `${last}_${first}_${matter}_${slugForFile(cat.slug)}_${docDate}.pdf`;
  const archiveMonth = monthFolder(receivedAt);

  return {
    renamedTo,
    folder: cat.folder,
    archivedTo: `Archive/${archiveMonth}`,
    followUp: cat.followUp,
  };
}

function pickLastName(claimant: string | null, matched: string | null): string {
  const src = matched ?? claimant ?? "Unknown";
  const parts = src.trim().split(/\s+/);
  return sanitize(parts.length > 1 ? parts[parts.length - 1] : parts[0]);
}

function pickFirstName(claimant: string | null, matched: string | null): string {
  const src = matched ?? claimant ?? "Unknown";
  const parts = src.trim().split(/\s+/);
  return sanitize(parts[0]);
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z-]/g, "") || "Unknown";
}

function slugForFile(slug: string): string {
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function monthFolder(iso: string): string {
  const d = new Date(iso);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m} (${months[d.getUTCMonth()]})`;
}
