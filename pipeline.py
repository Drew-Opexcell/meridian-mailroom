# The boss. Takes one letter and runs it through every step in order:
#   ingest, classify + extract, match, gate, then route (if the gate allows it)
#
# Each step adds an "event" to a list, and the list is the record of the run.

import json
from datetime import datetime, timezone

import llm
import recorded
from fuzzy import match_client
from recorded import DATA
from router import route_letter
from taxonomy import BY_SLUG, CONFIDENCE_FLOOR

with open(DATA / "clients.json", encoding="utf-8") as f:
    CLIENTS = json.load(f)


def now():
    return datetime.now(timezone.utc).isoformat()


def run_pipeline(letter, live=False):
    # live=True asks Claude; live=False uses the saved answers
    ask = llm if live else recorded
    events = []

    def log(stage, payload=None, tokens=None, message=None):
        events.append({
            "letter_id": letter["id"],
            "mode": "live" if live else "recorded",
            "stage": stage,
            "status": "complete",
            "payload": payload,
            "tokens": tokens,
            "message": message,
            "ts": now(),
        })

    # 1. ingest: note which scanned file came in
    log("ingest", message=letter["scan_filename"])

    # 2. ask Claude the two questions
    cls, cls_tokens = ask.classify(letter)
    log("classify", payload=cls, tokens=cls_tokens)
    ext, ext_tokens = ask.extract(letter)
    log("extract", payload=ext, tokens=ext_tokens)

    # 3. find which client it belongs to
    match = match_client(ext, CLIENTS)
    log("match", payload=match)

    # 4. the gate: does a human need to see this first?
    gate = evaluate_gate(cls["category"], cls["confidence"], match["matched"])
    log("gate", payload=gate)

    if gate["divert"]:
        log("done", message="diverted to review")
        return events

    # 5. cleared, so route it
    route = route_letter(cls, ext, match, letter["received_at"])
    log("route", payload=route)
    log("done", message="auto-routed")
    return events


def evaluate_gate(category, confidence, matched):
    """Three ways a letter gets held for a human, checked in this order."""
    cat = BY_SLUG[category]

    # high-stakes kind of letter (denials, awards, deadlines...)
    if cat["review_gate"]:
        return {"divert": True, "reason": cat["gate_reason"]}

    # Claude wasn't sure enough what it is
    if confidence < CONFIDENCE_FLOOR:
        return {
            "divert": True,
            "reason": f"classification confidence {confidence:.2f} is below the {CONFIDENCE_FLOOR} floor",
        }

    # couldn't tell whose letter it is
    if not matched:
        return {"divert": True, "reason": "no client match; a human confirms who this belongs to before filing"}

    return {"divert": False, "reason": None}
