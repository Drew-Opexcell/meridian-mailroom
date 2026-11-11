# Re-records data/recorded_runs.json by running every letter through Claude.
# Only needed after changing the letters or the prompts.
# Needs ANTHROPIC_API_KEY and makes 36 API calls.

import json
from datetime import datetime, timezone

from pipeline import run_pipeline
from recorded import DATA

with open(DATA / "letters.json", encoding="utf-8") as f:
    LETTERS = json.load(f)

runs = {}
for letter in LETTERS:
    print(f"recording {letter['id']} ({letter['scan_filename']})... ", end="", flush=True)
    events = run_pipeline(letter, live=True)
    for e in events:
        e["mode"] = "recorded"
    runs[letter["id"]] = events
    print(events[-1]["message"])

out = {"captured_at": datetime.now(timezone.utc).isoformat(), "runs": runs}
with open(DATA / "recorded_runs.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print("\nwrote data/recorded_runs.json")
