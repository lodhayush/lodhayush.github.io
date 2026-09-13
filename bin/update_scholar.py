#!/usr/bin/env python
"""
update_scholar.py
─────────────────
Keeps the site in sync with the Google Scholar profile named by
`scholar_userid` in _config.yml:

  1. Citation counts → _data/citations.yml, keyed "<scholar_userid>:<paper id>",
     which is what the google_scholar badge in _layouts/bib.liquid reads.
  2. Entries in _bibliography/papers.bib that match a Scholar paper by title
     but have no `google_scholar_id` get one, so their badge appears.
  3. Papers on Scholar that are missing from papers.bib are appended as new
     BibTeX entries, built from the paper's Scholar page (DOI from Crossref
     when a title matches exactly).

Scholar has no API and no change notifications, so this reads the public
profile HTML and CI runs it on a schedule. When Scholar blocks the request
(CAPTCHA / HTTP 429, common for datacenter IPs) the script exits non-zero
WITHOUT writing anything, so the last good counts stay on the site.

Usage:
    python bin/update_scholar.py

Requires: requests, pyyaml
"""

import difflib
import html
import random
import re
import sys
import time
import unicodedata
from datetime import datetime
from pathlib import Path

import requests
import yaml

CONFIG_PATH = Path("_config.yml")
BIB_PATH = Path("_bibliography/papers.bib")
OUTPUT_PATH = Path("_data/citations.yml")

SCHOLAR_URL = "https://scholar.google.com/citations"
PAGE_SIZE = 100
SCHOLAR_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
CROSSREF_HEADERS = {"User-Agent": "al-folio-scholar-sync/1.0 (mailto:ayushlodh26@gmail.com)"}
TIMEOUT = 30
RETRIES = 3

# Venue name fragment → badge abbreviation for newly added papers.
# Colours for these live in _data/venues.yml.
VENUE_ABBR = [
    ("document analysis and recognition", "ICDAR"),
    ("asian conference on pattern recognition", "ACPR"),
    ("knowledge discovery in databases", "ECML PKDD"),
    ("arxiv", "arXiv"),
]
TITLE_STOPWORDS = {"a", "an", "the", "on", "of", "for", "to", "in", "and", "towards", "from"}


class ScholarBlocked(Exception):
    """Scholar refused to serve the page (CAPTCHA, rate limit, or bad layout)."""


session = requests.Session()
session.headers.update(SCHOLAR_HEADERS)


# ── helpers ──────────────────────────────────────────────────────────────────


def clean(fragment: str) -> str:
    """HTML fragment → plain single-line text."""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def normalize(title: str) -> str:
    """Comparable form of a title: no LaTeX, accents, case, or punctuation."""
    title = re.sub(r"\\[a-zA-Z]+|\\.", "", title)  # drop LaTeX commands like {\'o}
    title = unicodedata.normalize("NFKD", title)
    title = "".join(c for c in title if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", title.lower())


def is_blocked(text: str) -> bool:
    lowered = text.lower()
    return "gs_captcha" in lowered or "unusual traffic" in lowered or "recaptcha" in lowered


def fetch_scholar(params: dict) -> str:
    """GET a Scholar page with retries; raises ScholarBlocked if it never works."""
    problem = "no response"
    for attempt in range(1, RETRIES + 1):
        try:
            resp = session.get(SCHOLAR_URL, params=params, timeout=TIMEOUT)
            if resp.status_code == 200 and not is_blocked(resp.text):
                return resp.text
            problem = f"HTTP {resp.status_code}" + (" with a CAPTCHA page" if is_blocked(resp.text) else "")
        except requests.RequestException as e:
            problem = str(e)
        if attempt < RETRIES:
            wait = 10 * attempt + random.uniform(0, 5)
            print(f"      … Scholar attempt {attempt} failed ({problem}); retrying in {wait:.0f}s")
            time.sleep(wait)
    raise ScholarBlocked(problem)


def polite_pause() -> None:
    time.sleep(random.uniform(2, 4))


# ── Scholar ──────────────────────────────────────────────────────────────────


def read_scholar_userid() -> str:
    match = re.search(r"^scholar_userid:\s*([\w-]+)", CONFIG_PATH.read_text(encoding="utf-8"), re.M)
    if not match:
        print(f"❌ No scholar_userid in {CONFIG_PATH}.")
        sys.exit(1)
    return match.group(1)


def fetch_profile(user: str) -> tuple[list[dict], dict]:
    """Every paper on the profile (id, title, year, citations) plus totals."""
    papers, stats, start = [], {}, 0
    while True:
        page = fetch_scholar({"user": user, "hl": "en", "cstart": start, "pagesize": PAGE_SIZE})
        if 'id="gsc_prf_in"' not in page:
            # 200 OK but not a profile: a consent/interstitial page or a layout change.
            raise ScholarBlocked("response was not a Scholar profile page")

        if not stats:
            numbers = [int(n) for n in re.findall(r'<td class="gsc_rsb_std">(\d+)</td>', page)]
            if len(numbers) >= 6:
                stats = {"total_citations": numbers[0], "h_index": numbers[2], "i10_index": numbers[4]}

        rows = re.findall(r'<tr class="gsc_a_tr">(.*?)</tr>', page, re.S)
        for row in rows:
            pub = re.search(r"citation_for_view=([\w-]+):([\w-]+)", row)
            title = re.search(r'class="gsc_a_at"[^>]*>(.*?)</a>', row, re.S)
            if not (pub and title):
                continue
            cites = re.search(r'class="gsc_a_ac gs_ibl"[^>]*>(\d*)</a>', row)
            year = re.search(r'class="gsc_a_h gsc_a_hc gs_ibl">(\d*)<', row)
            papers.append(
                {
                    "id": pub.group(2),
                    "title": clean(title.group(1)),
                    "year": year.group(1) if year else "",
                    "citations": int(cites.group(1)) if cites and cites.group(1) else 0,
                }
            )

        if len(rows) < PAGE_SIZE:
            return papers, stats
        start += PAGE_SIZE
        polite_pause()


def fetch_paper_details(user: str, pub_id: str) -> dict:
    """Field → value map from a paper's Scholar page (Authors, Pages, ...)."""
    page = fetch_scholar({"view_op": "view_citation", "hl": "en", "user": user, "citation_for_view": f"{user}:{pub_id}"})
    title = re.search(r'<div id="gsc_oci_title"[^>]*>(.*?)</div>', page, re.S)
    fields = {
        clean(name): clean(value)
        for name, value in re.findall(
            r'<div class="gsc_oci_field">(.*?)</div>\s*<div class="gsc_oci_value"[^>]*>(.*?)</div>', page, re.S
        )
    }
    fields["Title"] = clean(title.group(1)) if title else ""
    return fields


# ── Crossref ─────────────────────────────────────────────────────────────────


def crossref_doi(title: str) -> str:
    """DOI of the Crossref record whose title matches exactly, else ""."""
    try:
        resp = requests.get(
            "https://api.crossref.org/works",
            params={"query.bibliographic": title, "rows": 5, "select": "DOI,title"},
            headers=CROSSREF_HEADERS,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        items = resp.json()["message"]["items"]
    except Exception as e:  # a missing DOI must never block adding the paper
        print(f"      ! Crossref lookup failed: {e}")
        return ""
    wanted = normalize(title)
    for item in items:
        for candidate in item.get("title") or []:
            # endswith: some publishers prepend figure alt-text to the title
            if normalize(candidate).endswith(wanted):
                return item["DOI"]
    return ""


# ── BibTeX ───────────────────────────────────────────────────────────────────

ENTRY_RE = re.compile(r"@(\w+)\s*\{\s*([^,\s]+)\s*,(.*?)\n\}", re.S)


def bib_field(body: str, name: str) -> str:
    match = re.search(rf"\b{name}\s*=\s*\{{(.*?)\}},?\s*\n", body, re.S)
    return re.sub(r"\s+", " ", match.group(1)).strip() if match else ""


def parse_bib(text: str) -> list[dict]:
    return [
        {
            "key": m.group(2),
            "title": bib_field(m.group(3), "title"),
            "doi": bib_field(m.group(3), "doi"),
            "google_scholar_id": bib_field(m.group(3), "google_scholar_id"),
        }
        for m in ENTRY_RE.finditer(text)
    ]


def match_entry(paper: dict, entries: list[dict]) -> dict | None:
    for entry in entries:
        if entry["google_scholar_id"] == paper["id"]:
            return entry
    wanted = normalize(paper["title"])
    for entry in entries:
        have = normalize(entry["title"])
        if have == wanted or difflib.SequenceMatcher(None, have, wanted).ratio() >= 0.9:
            return entry
    return None


def add_scholar_ids(text: str, ids_by_key: dict[str, str]) -> str:
    """Insert google_scholar_id={...} into the named entries."""

    def insert(m: re.Match) -> str:
        pub_id = ids_by_key.get(m.group(2))
        if not pub_id:
            return m.group(0)
        head = m.group(0)[: m.start(3) - m.start(0)]
        return f"{head}\n  google_scholar_id={{{pub_id}}},{m.group(3)}\n}}"

    return ENTRY_RE.sub(insert, text)


def bib_escape(value: str) -> str:
    return value.replace("&", r"\&").replace("%", r"\%")


def bib_authors(authors: str) -> str:
    """'Ayush Lodh, Sanket Biswas' → 'Lodh, Ayush and Biswas, Sanket'."""
    names = []
    for name in [a.strip() for a in authors.split(",") if a.strip()]:
        parts = name.split()
        names.append(parts[0] if len(parts) == 1 else f"{parts[-1]}, {' '.join(parts[:-1])}")
    return " and ".join(names)


def make_key(details: dict, year: str, taken: set[str]) -> str:
    first_author = (details.get("Authors") or "unknown").split(",")[0].split()
    last = normalize(first_author[-1] if first_author else "unknown") or "unknown"
    words = [w for w in re.findall(r"[a-z0-9]+", details["Title"].lower()) if w not in TITLE_STOPWORDS]
    base = f"{last}{year}{words[0] if words else 'paper'}"
    key, suffix = base, ord("b")
    while key in taken:
        key, suffix = f"{base}{chr(suffix)}", suffix + 1
    return key


def build_entry(details: dict, pub_id: str, fallback_year: str, taken: set[str]) -> str:
    year = (re.match(r"\d{4}", details.get("Publication date", "")) or [fallback_year])[0]
    venue = details.get("Conference") or details.get("Book") or details.get("Journal") or details.get("Source") or ""

    if details.get("Journal") or "arxiv" in venue.lower():
        entry_type, venue_field = "article", "journal"
    elif details.get("Conference") or details.get("Book"):
        entry_type, venue_field = "inproceedings", "booktitle"
    else:
        entry_type, venue_field = "misc", "howpublished"

    abbr = next((a for fragment, a in VENUE_ABBR if fragment in venue.lower()), "")
    doi = crossref_doi(details["Title"])

    fields = [
        ("abbr", abbr),
        ("bibtex_show", "true"),
        ("google_scholar_id", pub_id),
        ("title", bib_escape(details["Title"])),
        ("author", bib_escape(bib_authors(details.get("Authors", "")))),
        (venue_field, bib_escape(venue)),
        ("volume", details.get("Volume", "")),
        ("number", details.get("Issue", "")),
        ("pages", details.get("Pages", "").replace("-", "--")),
        ("year", year),
        ("publisher", bib_escape(details.get("Publisher", ""))),
        ("doi", doi),
        ("html", f"https://doi.org/{doi}" if doi else ""),
    ]
    key = make_key(details, year, taken)
    body = "".join(f"  {name}={{{value}}},\n" for name, value in fields if value)
    return key, f"@{entry_type}{{{key},\n{body}}}\n"


# ── main ─────────────────────────────────────────────────────────────────────


def main() -> None:
    user = read_scholar_userid()
    print(f"🔍 Syncing with Google Scholar profile {user}\n")

    try:
        scholar_papers, stats = fetch_profile(user)
    except ScholarBlocked as e:
        print(f"❌ Google Scholar did not serve the profile ({e}). Nothing was changed.")
        sys.exit(1)
    if not scholar_papers:
        print("❌ The profile page parsed to zero papers. Nothing was changed.")
        sys.exit(1)
    print(f"📚 {len(scholar_papers)} papers on Scholar · {stats.get('total_citations', '?')} citations total\n")

    bib_text = BIB_PATH.read_text(encoding="utf-8")
    entries = parse_bib(bib_text)
    taken = {e["key"] for e in entries}
    ids_to_add, new_entries = {}, []

    for paper in scholar_papers:
        print(f"  • [{paper['citations']:>3}] {paper['title'][:70]}")
        entry = match_entry(paper, entries)
        if entry:
            if not entry["google_scholar_id"]:
                ids_to_add[entry["key"]] = paper["id"]
                print(f"        tagging {entry['key']} with google_scholar_id={paper['id']}")
            continue

        print("        not in papers.bib — fetching details to add it")
        polite_pause()
        try:
            details = fetch_paper_details(user, paper["id"])
        except ScholarBlocked as e:
            print(f"        ! skipped this run ({e}); counts are still updated")
            continue
        if not details["Title"]:
            print("        ! could not read the paper page; skipped this run")
            continue
        key, entry_text = build_entry(details, paper["id"], paper["year"], taken)
        taken.add(key)
        new_entries.append(entry_text)
        print(f"        added as {key}")

    # ── write papers.bib ──
    if ids_to_add or new_entries:
        updated = add_scholar_ids(bib_text, ids_to_add)
        if new_entries:
            front_matter = re.match(r"---\s*\n---\s*\n", updated)
            cut = front_matter.end() if front_matter else 0
            updated = updated[:cut] + "\n" + "\n".join(new_entries) + updated[cut:]
        BIB_PATH.write_text(updated, encoding="utf-8")
        print(f"\n✅ papers.bib: {len(new_entries)} added, {len(ids_to_add)} tagged with a Scholar id")

    # ── write citations.yml ──
    citations = {
        f"{user}:{p['id']}": {"title": p["title"], "year": p["year"], "citations": p["citations"]} for p in scholar_papers
    }
    existing = {}
    if OUTPUT_PATH.exists():
        try:
            existing = yaml.safe_load(OUTPUT_PATH.read_text(encoding="utf-8")) or {}
        except Exception as e:
            print(f"⚠️  Could not read existing {OUTPUT_PATH}: {e}")
    old_meta = {k: v for k, v in (existing.get("metadata") or {}).items() if k != "last_updated"}
    new_meta = {"scholar_userid": user, **stats}

    if existing.get("papers") == citations and old_meta == new_meta:
        print(f"ℹ️  Citation counts unchanged; leaving {OUTPUT_PATH} alone.")
        return

    header = (
        "# Auto-generated by bin/update_scholar.py (.github/workflows/update-citations.yml).\n"
        "# Source: Google Scholar profile. Do not edit by hand.\n"
        '# Keyed "<scholar_userid>:<google_scholar_id>" as read by _layouts/bib.liquid.\n'
    )
    data = {"metadata": {"last_updated": datetime.now().strftime("%Y-%m-%d"), **new_meta}, "papers": citations}
    OUTPUT_PATH.write_text(header + yaml.dump(data, width=1000, sort_keys=True, allow_unicode=True), encoding="utf-8")
    print(f"✅ Wrote {len(citations)} papers to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
