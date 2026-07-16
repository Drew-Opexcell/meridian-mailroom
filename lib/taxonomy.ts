import type { Category, CategorySlug } from "./types";

export const TAXONOMY: Category[] = [
  {
    slug: "award_notice",
    label: "Award Notice",
    folder: "01 Awards",
    reviewGate: true,
    gateReason: "A favorable decision sets benefit amounts and appeal windows; a human confirms before anything is filed or calendared.",
    followUp: "Notify handling attorney; calendar benefits verification",
    promptHint: "Notice that the claim was approved, fully or partially favorable, benefits awarded.",
  },
  {
    slug: "initial_denial",
    label: "Initial Denial",
    folder: "02 Denials - Initial",
    reviewGate: true,
    gateReason: "Denials start a hard 60-day appeal clock; misfiling one can cost the claimant their case.",
    followUp: "Calendar 60-day reconsideration deadline",
    promptHint: "Denial of the initial application for disability benefits.",
  },
  {
    slug: "recon_denial",
    label: "Reconsideration Denial",
    folder: "03 Denials - Reconsideration",
    reviewGate: true,
    gateReason: "Reconsideration denials start the hearing-request clock; a human verifies the deadline.",
    followUp: "Calendar 60-day hearing-request deadline",
    promptHint: "Denial at the reconsideration level, after an initial denial was appealed.",
  },
  {
    slug: "hearing_notice",
    label: "Hearing Notice",
    folder: "04 Hearings",
    reviewGate: false,
    followUp: "Calendar hearing date; notify claimant",
    promptHint: "Notice scheduling a hearing before an administrative law judge, with a date and time.",
  },
  {
    slug: "appeal_deadline",
    label: "Appeal Deadline Warning",
    folder: "05 Deadlines",
    reviewGate: true,
    gateReason: "Deadline warnings are time-critical; a human triages immediately rather than trusting an auto-route.",
    followUp: "Urgent flag; calendar the stated deadline",
    promptHint: "A warning that an appeal or response deadline is approaching or has nearly passed.",
  },
  {
    slug: "good_cause",
    label: "Good Cause / Late Filing",
    folder: "06 Good Cause",
    reviewGate: true,
    gateReason: "Good-cause letters have no clean bucket and turn on legal judgment; they go straight to the supervising attorney.",
    followUp: "Route to supervising attorney",
    promptHint: "Correspondence about good cause for late filing, or a request to accept a late appeal.",
  },
  {
    slug: "ce_appointment",
    label: "CE Appointment",
    folder: "07 CE Exams",
    reviewGate: false,
    followUp: "Calendar exam; send claimant reminder",
    promptHint: "Scheduling of a consultative examination (CE) with a medical provider for the claimant.",
  },
  {
    slug: "records_request",
    label: "Medical Records Request",
    folder: "08 Records Requests",
    reviewGate: false,
    followUp: "Forward to records clerk; log the request",
    promptHint: "A request for medical or other records related to the claim.",
  },
  {
    slug: "benefit_statement",
    label: "Payment / Benefit Statement",
    folder: "09 Financial",
    reviewGate: false,
    followUp: "File to financial folder",
    promptHint: "A statement of payments made or benefit amounts, routine financial correspondence.",
  },
  {
    slug: "overpayment_notice",
    label: "Overpayment Notice",
    folder: "10 Overpayments",
    reviewGate: true,
    gateReason: "Overpayment notices demand money back and carry their own appeal rights; a human reviews before filing.",
    followUp: "Flag for attorney review",
    promptHint: "Notice that the claimant was overpaid and money may be owed back.",
  },
  {
    slug: "fee_authorization",
    label: "Attorney Fee Authorization",
    folder: "11 Fees",
    reviewGate: false,
    followUp: "File to fees folder; notify billing",
    promptHint: "Authorization or notice regarding the representative's fee.",
  },
  {
    slug: "other",
    label: "Other / Unclassifiable",
    folder: "99 Manual Triage",
    reviewGate: true,
    gateReason: "Anything the classifier is unsure of, or that fits no category, is held for a human rather than force-fit into a bucket.",
    followUp: "Hold for manual triage",
    promptHint: "Anything that does not clearly fit the other categories, or that is ambiguous.",
  },
];

export const BY_SLUG: Record<CategorySlug, Category> = Object.fromEntries(
  TAXONOMY.map((c) => [c.slug, c]),
) as Record<CategorySlug, Category>;

// below this, even non-gated categories go to review
export const CONFIDENCE_FLOOR = 0.7;
