# Turns one run's events into a single row for the audit log, and writes
# rows out as CSV.

import csv
import io

from taxonomy import BY_SLUG


def find_payload(events, stage):
    for e in events:
        if e["stage"] == stage:
            return e["payload"]
    return None


def build_audit_row(events, review_decision):
    cls = find_payload(events, "classify")
    ext = find_payload(events, "extract")
    match = find_payload(events, "match")
    gate = find_payload(events, "gate")
    route = find_payload(events, "route")

    first = events[0]
    done = events[-1]
    tokens_in = sum(e["tokens"]["input"] for e in events if e["tokens"])
    tokens_out = sum(e["tokens"]["output"] for e in events if e["tokens"])

    return {
        "Timestamp": done["ts"],
        "Mode": first["mode"],
        "Doc": first["letter_id"],
        "Source file": first["message"],
        "Category": BY_SLUG[cls["category"]]["label"],
        "Conf.": round(cls["confidence"], 2),
        "Claimant": ext["claimant_name"] or "",
        "ID4": ext["ssn_last4"] or "",
        "Doc date": ext["doc_date"] or "",
        "Matched client": match["client_name"] or "",
        "Matter": match["matter_id"] or "",
        "Score": match["score"] if match["score"] is not None else "",
        "Method": match["method"],
        "Gate": "review" if gate["divert"] else "auto",
        "Review": review_decision,
        "Renamed to": route["renamed_to"] if route else "",
        "Folder": route["folder"] if route else "",
        "Follow-up": route["follow_up"] if route else "",
        "Tok in": tokens_in,
        "Tok out": tokens_out,
    }


def to_csv(rows):
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    return out.getvalue()
