# The 12 kinds of letter the firm gets, and the rules for each one.
# Same as lib/taxonomy.ts.
#
#   slug         the short name the code uses
#   label        the name people see
#   folder       where a routed letter gets filed
#   review_gate  True means a human must look at it first, no matter what
#   gate_reason  why it's held (only gated ones have this)
#   follow_up    the task to create after filing
#   prompt_hint  how the category is described to Claude

TAXONOMY = [
    {
        "slug": "award_notice",
        "label": "Award Notice",
        "folder": "01 Awards",
        "review_gate": True,
        "gate_reason": "A favorable decision sets benefit amounts and appeal windows; a human confirms before anything is filed or calendared.",
        "follow_up": "Notify handling attorney; calendar benefits verification",
        "prompt_hint": "Notice that the claim was approved, fully or partially favorable, benefits awarded.",
    },
    {
        "slug": "initial_denial",
        "label": "Initial Denial",
        "folder": "02 Denials - Initial",
        "review_gate": True,
        "gate_reason": "Denials start a hard 60-day appeal clock; misfiling one can cost the claimant their case.",
        "follow_up": "Calendar 60-day reconsideration deadline",
        "prompt_hint": "Denial of the initial application for disability benefits.",
    },
    {
        "slug": "recon_denial",
        "label": "Reconsideration Denial",
        "folder": "03 Denials - Reconsideration",
        "review_gate": True,
        "gate_reason": "Reconsideration denials start the hearing-request clock; a human verifies the deadline.",
        "follow_up": "Calendar 60-day hearing-request deadline",
        "prompt_hint": "Denial at the reconsideration level, after an initial denial was appealed.",
    },
    {
        "slug": "hearing_notice",
        "label": "Hearing Notice",
        "folder": "04 Hearings",
        "review_gate": False,
        "follow_up": "Calendar hearing date; notify claimant",
        "prompt_hint": "Notice scheduling a hearing before an administrative law judge, with a date and time.",
    },
    {
        "slug": "appeal_deadline",
        "label": "Appeal Deadline Warning",
        "folder": "05 Deadlines",
        "review_gate": True,
        "gate_reason": "Deadline warnings are time-critical; a human triages immediately rather than trusting an auto-route.",
        "follow_up": "Urgent flag; calendar the stated deadline",
        "prompt_hint": "A warning that an appeal or response deadline is approaching or has nearly passed.",
    },
    {
        "slug": "good_cause",
        "label": "Good Cause / Late Filing",
        "folder": "06 Good Cause",
        "review_gate": True,
        "gate_reason": "Good-cause letters have no clean bucket and turn on legal judgment; they go straight to the supervising attorney.",
        "follow_up": "Route to supervising attorney",
        "prompt_hint": "Correspondence about good cause for late filing, or a request to accept a late appeal.",
    },
    {
        "slug": "ce_appointment",
        "label": "CE Appointment",
        "folder": "07 CE Exams",
        "review_gate": False,
        "follow_up": "Calendar exam; send claimant reminder",
        "prompt_hint": "Scheduling of a consultative examination (CE) with a medical provider for the claimant.",
    },
    {
        "slug": "records_request",
        "label": "Medical Records Request",
        "folder": "08 Records Requests",
        "review_gate": False,
        "follow_up": "Forward to records clerk; log the request",
        "prompt_hint": "A request for medical or other records related to the claim.",
    },
    {
        "slug": "benefit_statement",
        "label": "Payment / Benefit Statement",
        "folder": "09 Financial",
        "review_gate": False,
        "follow_up": "File to financial folder",
        "prompt_hint": "A statement of payments made or benefit amounts, routine financial correspondence.",
    },
    {
        "slug": "overpayment_notice",
        "label": "Overpayment Notice",
        "folder": "10 Overpayments",
        "review_gate": True,
        "gate_reason": "Overpayment notices demand money back and carry their own appeal rights; a human reviews before filing.",
        "follow_up": "Flag for attorney review",
        "prompt_hint": "Notice that the claimant was overpaid and money may be owed back.",
    },
    {
        "slug": "fee_authorization",
        "label": "Attorney Fee Authorization",
        "folder": "11 Fees",
        "review_gate": False,
        "follow_up": "File to fees folder; notify billing",
        "prompt_hint": "Authorization or notice regarding the representative's fee.",
    },
    {
        "slug": "other",
        "label": "Other / Unclassifiable",
        "folder": "99 Manual Triage",
        "review_gate": True,
        "gate_reason": "Anything the classifier is unsure of, or that fits no category, is held for a human rather than force-fit into a bucket.",
        "follow_up": "Hold for manual triage",
        "prompt_hint": "Anything that does not clearly fit the other categories, or that is ambiguous.",
    },
]

# A lookup by slug, so other files can write BY_SLUG["award_notice"]
# instead of looping through the list every time.
BY_SLUG = {}
for category in TAXONOMY:
    BY_SLUG[category["slug"]] = category

# If Claude is less than 70% sure what a letter is, a human checks it,
# even when the category normally routes on its own.
CONFIDENCE_FLOOR = 0.7
