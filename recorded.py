# The same two questions as llm.py, answered from a saved run instead of
# calling Claude. data/recorded_runs.json holds Claude's real answers for
# all 18 letters, so the pipeline runs free and with no API key.

import json
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"

with open(DATA / "recorded_runs.json", encoding="utf-8") as f:
    RUNS = json.load(f)["runs"]


def saved_answer(letter_id, stage):
    for event in RUNS[letter_id]:
        if event["stage"] == stage and event["status"] == "complete":
            return event["payload"], event["tokens"]
    raise ValueError(f"no saved {stage} answer for {letter_id}")


def classify(letter):
    return saved_answer(letter["id"], "classify")


def extract(letter):
    return saved_answer(letter["id"], "extract")
