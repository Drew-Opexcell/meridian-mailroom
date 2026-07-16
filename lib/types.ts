export type CategorySlug =
  | "award_notice"
  | "initial_denial"
  | "recon_denial"
  | "hearing_notice"
  | "appeal_deadline"
  | "good_cause"
  | "ce_appointment"
  | "records_request"
  | "benefit_statement"
  | "overpayment_notice"
  | "fee_authorization"
  | "other";

export interface Category {
  slug: CategorySlug;
  label: string;
  folder: string;
  reviewGate: boolean;
  gateReason?: string;
  followUp: string;
  promptHint: string;
}

export interface Client {
  id: string;
  matterId: string;
  firstName: string;
  lastName: string;
  dob: string; // ISO date
  ssnLast4: string;
  attorney: string;
  stage: string;
}

export interface Letter {
  id: string;
  scanFilename: string;
  receivedAt: string; // ISO datetime
  letterheadStyle: "bda" | "bda_appeals" | "medical" | "generic";
  bodyText: string;
}

export interface ClassifyResult {
  category: CategorySlug;
  confidence: number; // 0-1
  rationale: string;
}

export interface ExtractResult {
  claimantName: string | null;
  dob: string | null;
  ssnLast4: string | null;
  docDate: string | null;
}

export interface MatchResult {
  matched: boolean;
  clientId: string | null;
  matterId: string | null;
  clientName: string | null;
  method: "exact" | "fuzzy" | "fuzzy+dob" | "none";
  distance: number | null;
  score: number | null;
  note?: string;
}

export interface GateResult {
  divert: boolean;
  reason: string | null;
}

export interface RouteResult {
  renamedTo: string;
  folder: string;
  archivedTo: string;
  followUp: string;
}

export type StagePayload =
  | ClassifyResult
  | ExtractResult
  | MatchResult
  | GateResult
  | RouteResult;

export type StageName =
  | "ingest"
  | "classify"
  | "extract"
  | "match"
  | "gate"
  | "route"
  | "done"
  | "error";

export interface StageEvent {
  runId: string;
  letterId: string;
  mode: "recorded" | "live";
  stage: StageName;
  status: "start" | "complete";
  payload?: StagePayload;
  tokens?: { input: number; output: number };
  durationMs?: number;
  ts: string;
  message?: string;
}

export type LetterStatus =
  | "unprocessed"
  | "processing"
  | "routed"
  | "in_review"
  | "approved"
  | "overridden"
  | "rejected";

export interface ReviewItem {
  letterId: string;
  classify: ClassifyResult;
  extract: ExtractResult;
  match: MatchResult;
  reason: string;
  queuedAt: string;
}

export interface AuditRow {
  ts: string;
  runId: string;
  mode: string;
  letterId: string;
  sourceFile: string;
  category: string;
  confidence: number | "";
  claimant: string;
  ssnLast4: string;
  docDate: string;
  matchedClient: string;
  matterId: string;
  matchScore: number | "";
  matchMethod: string;
  gate: string;
  reviewDecision: string;
  renamedTo: string;
  routedFolder: string;
  followUp: string;
  tokensIn: number | "";
  tokensOut: number | "";
  durationMs: number | "";
}
