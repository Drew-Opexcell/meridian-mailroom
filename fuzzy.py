# Matches the name on a scanned letter to a client, even when the scan
# garbled it ("R0bert Castiilo" should still find Robert Castillo).
# Same as lib/fuzzy.ts.

import re


def damerau_levenshtein(a, b):
    """How many single-letter edits turn a into b.

    An edit is adding a letter, deleting one, changing one, or swapping
    two letters that sit next to each other.
    "robert" vs "rXbert" is 1 (one change).
    "robert" vs "rboert" is 1 (one swap).
    """
    m = len(a)
    n = len(b)
    if m == 0:
        return n
    if n == 0:
        return m

    # d[i][j] = edits to turn the first i letters of a into the first j of b
    d = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        d[i][0] = i
    for j in range(n + 1):
        d[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            d[i][j] = min(
                d[i - 1][j] + 1,         # delete a letter
                d[i][j - 1] + 1,         # add a letter
                d[i - 1][j - 1] + cost,  # change a letter (free if same)
            )
            # two neighbors swapped, like "ob" vs "bo"
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1)
    return d[m][n]


def normalize_name(raw):
    """Cleans a name before comparing: lowercase, drops Jr/Sr/II/III/IV,
    drops anything that isn't a letter, turns hyphens into spaces."""
    s = raw.lower()
    s = re.sub(r"\b(jr|sr|ii|iii|iv)\.?\b", " ", s)
    s = re.sub(r"[^a-z\s-]", "", s)
    s = s.replace("-", " ")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def name_similarity(a, b):
    """A score from 0 to 1. 1 means the names are identical after cleaning."""
    na = normalize_name(a)
    nb = normalize_name(b)
    if not na or not nb:
        return 0
    dist = damerau_levenshtein(na, nb)
    longest = max(len(na), len(nb))
    return 1 - dist / longest


EXACT_THRESHOLD = 0.999
FUZZY_THRESHOLD = 0.8  # below this, we say there's no match at all


def no_match(note, distance=None, score=None):
    return {
        "matched": False,
        "client_id": None,
        "matter_id": None,
        "client_name": None,
        "method": "none",
        "distance": distance,
        "score": score,
        "note": note,
    }


def match_client(extract, clients):
    """Finds which client a letter belongs to.

    The closest name wins. If several clients are close, the birthday
    on the letter breaks the tie.
    """
    claimant = (extract["claimant_name"] or "").strip()
    if not claimant:
        return no_match("no claimant name extracted")

    # score every client against the name on the letter
    scored = []
    for client in clients:
        full = f"{client['first_name']} {client['last_name']}"
        sim = name_similarity(claimant, full)
        dist = damerau_levenshtein(normalize_name(claimant), normalize_name(full))
        scored.append({"client": client, "sim": sim, "dist": dist})

    # best score first
    scored.sort(key=lambda s: s["sim"], reverse=True)

    best = scored[0] if scored else None
    if best is None or best["sim"] < FUZZY_THRESHOLD:
        return no_match(
            "no client above match threshold",
            distance=best["dist"] if best else None,
            score=round(best["sim"], 2) if best else None,
        )

    # everyone within 0.1 of the best score is still in the running
    contenders = [s for s in scored if best["sim"] - s["sim"] <= 0.1]

    chosen = best
    used_dob = False
    if len(contenders) > 1 and extract["dob"]:
        for s in contenders:
            if s["client"]["dob"] == extract["dob"]:
                chosen = s
                used_dob = True
                break

    if chosen["sim"] >= EXACT_THRESHOLD:
        method = "exact"
    elif used_dob:
        method = "fuzzy+dob"
    else:
        method = "fuzzy"

    note = None
    if len(contenders) > 1:
        if used_dob:
            note = f"{len(contenders)} name candidates; DOB broke the tie"
        else:
            note = f"{len(contenders)} close candidates; picked highest similarity"

    c = chosen["client"]
    return {
        "matched": True,
        "client_id": c["id"],
        "matter_id": c["matter_id"],
        "client_name": f"{c['first_name']} {c['last_name']}",
        "method": method,
        "distance": chosen["dist"],
        "score": round(chosen["sim"], 2),
        "note": note,
    }
