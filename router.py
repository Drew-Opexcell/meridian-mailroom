# Decides where a letter goes once it's cleared to route on its own:
# its new file name, its folder, its archive month and its follow-up task.
# Same as lib/router.ts.
#
# The new file name looks like:
#   Castillo_Robert_M-2041_HearingNotice_2026-07-02.pdf
#   last     first  matter  kind of letter  letter date

import re
from datetime import datetime

from taxonomy import BY_SLUG

MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]


def route_letter(classify, extract, match, received_at):
    cat = BY_SLUG[classify["category"]]
    last = pick_last_name(extract["claimant_name"], match["client_name"])
    first = pick_first_name(extract["claimant_name"], match["client_name"])
    matter = match["matter_id"] or "UNMATCHED"
    doc_date = (extract["doc_date"] or received_at)[:10]

    renamed_to = f"{last}_{first}_{matter}_{slug_for_file(cat['slug'])}_{doc_date}.pdf"

    return {
        "renamed_to": renamed_to,
        "folder": cat["folder"],
        "archived_to": f"Archive/{month_folder(received_at)}",
        "follow_up": cat["follow_up"],
    }


def pick_last_name(claimant, matched):
    # prefer the client's real name over what the scan said
    src = matched or claimant or "Unknown"
    parts = src.split()
    return sanitize(parts[-1])


def pick_first_name(claimant, matched):
    src = matched or claimant or "Unknown"
    parts = src.split()
    return sanitize(parts[0])


def sanitize(s):
    # keep only letters and hyphens so the file name is safe
    cleaned = re.sub(r"[^A-Za-z-]", "", s)
    return cleaned or "Unknown"


def slug_for_file(slug):
    # "hearing_notice" becomes "HearingNotice"
    words = slug.split("_")
    return "".join(w[:1].upper() + w[1:] for w in words)


def month_folder(iso):
    # "2026-07-03T09:14:00Z" becomes "2026-07 (July)"
    d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return f"{d.year}-{d.month:02d} ({MONTHS[d.month - 1]})"
