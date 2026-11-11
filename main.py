# Run it:
#   python main.py              every letter, one line each
#   python main.py L07          one letter, every step shown
#   python main.py --csv        every letter, as an audit-log CSV
#   python main.py L07 --live   ask Claude for real (needs ANTHROPIC_API_KEY)

import json
import sys

from audit import build_audit_row, to_csv
from pipeline import run_pipeline
from recorded import DATA

with open(DATA / "letters.json", encoding="utf-8") as f:
    LETTERS = json.load(f)


def show_one(letter, live):
    print(letter["body_text"])
    print("\n" + "=" * 60)
    for e in run_pipeline(letter, live):
        print(f"\n[{e['stage']}]")
        if e["message"]:
            print(f"  {e['message']}")
        if e["payload"]:
            for key, value in e["payload"].items():
                print(f"  {key}: {value}")


def show_all(live):
    for letter in LETTERS:
        events = run_pipeline(letter, live)
        stages = {e["stage"]: e["payload"] for e in events}
        cls = stages["classify"]
        who = stages["match"]["client_name"] or "no match"
        if "route" in stages:
            outcome = "-> " + stages["route"]["renamed_to"]
        else:
            outcome = "-> held for review"
        print(f"{letter['id']}  {cls['category']:<20} {cls['confidence']:.2f}  {who:<22} {outcome}")


def show_csv(live):
    rows = []
    for letter in LETTERS:
        events = run_pipeline(letter, live)
        gate = next(e["payload"] for e in events if e["stage"] == "gate")
        rows.append(build_audit_row(events, "pending" if gate["divert"] else "auto"))
    print(to_csv(rows), end="")


args = sys.argv[1:]
live = "--live" in args
ids = [a.upper() for a in args if not a.startswith("--")]

if "--csv" in args:
    show_csv(live)
elif ids:
    found = [l for l in LETTERS if l["id"] == ids[0]]
    if found:
        show_one(found[0], live)
    else:
        print(f"No letter {ids[0]}. Try L01 to L{len(LETTERS):02d}.")
else:
    show_all(live)
