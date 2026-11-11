# The two questions the pipeline asks Claude about each letter:
#   classify: what kind of letter is it, and how sure are you (0 to 1)
#   extract:  the claimant's name, birthday, last 4 of their ID, and the letter's date
#
# Both use structured output, so Claude has to answer in the exact JSON
# shape we ask for. Claude only answers these questions. What happens to
# the letter afterwards is decided by ordinary code.

import json

from taxonomy import TAXONOMY

MODEL = "claude-sonnet-5"

CATEGORY_MENU = "\n".join(f"- {c['slug']}: {c['prompt_hint']}" for c in TAXONOMY)

CLASSIFY_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": [c["slug"] for c in TAXONOMY]},
        "confidence": {"type": "number"},
        "rationale": {"type": "string"},
    },
    "required": ["category", "confidence", "rationale"],
    "additionalProperties": False,
}

EXTRACT_SCHEMA = {
    "type": "object",
    "properties": {
        "claimant_name": {"type": ["string", "null"]},
        "dob": {"type": ["string", "null"]},
        "ssn_last4": {"type": ["string", "null"]},
        "doc_date": {"type": ["string", "null"]},
    },
    "required": ["claimant_name", "dob", "ssn_last4", "doc_date"],
    "additionalProperties": False,
}

_client = None


def client():
    # made on first use, so the recorded mode never needs the library or a key
    global _client
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic()
    return _client


def ask(prompt, schema, max_tokens):
    response = client().messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        thinking={"type": "disabled"},
        output_config={"format": {"type": "json_schema", "schema": schema}},
        messages=[{"role": "user", "content": prompt}],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Claude declined to answer for this letter")
    text = next(b.text for b in response.content if b.type == "text")
    tokens = {
        "input": response.usage.input_tokens,
        "output": response.usage.output_tokens,
    }
    return json.loads(text), tokens


def classify(letter):
    prompt = (
        "You sort incoming disability-law mail into one category. Categories:\n"
        f"{CATEGORY_MENU}\n\n"
        "Return the single best category, your confidence (0 to 1), and a one-sentence "
        'rationale. If the letter is vague or fits nothing well, use "other" with low confidence.\n\n'
        f'Letter:\n"""\n{letter["body_text"]}\n"""'
    )
    return ask(prompt, CLASSIFY_SCHEMA, max_tokens=320)


def extract(letter):
    prompt = (
        "Extract identifiers from this disability-law letter. Return the claimant's full name "
        "exactly as written (do not correct apparent typos, they matter downstream), date of "
        "birth as YYYY-MM-DD if present, the last 4 of any SSN or claim number if present, and "
        "the document date as YYYY-MM-DD. Use null for anything absent.\n\n"
        f'Letter:\n"""\n{letter["body_text"]}\n"""'
    )
    return ask(prompt, EXTRACT_SCHEMA, max_tokens=300)
