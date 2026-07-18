"""
fetch_publications.py
─────────────────────
Fetches all publications for the site owner from the OpenAlex API,
deduplicates arXiv preprints vs published versions,
and writes a BibTeX file to _bibliography/papers.bib.

WARNING: running this OVERWRITES _bibliography/papers.bib.
Set OPENALEX_AUTHOR_ID below first (find yours at https://openalex.org
by searching your name — the ID looks like "A1234567890").

Usage:
    python scripts/fetch_publications.py

Requires: requests  (pip install requests)
"""

import re
import time
import requests
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
OPENALEX_AUTHOR_ID = "A5119618310"  # Ayush Lodh — https://openalex.org/A5119618310
OUTPUT_PATH        = Path("_bibliography/papers.bib")
EMAIL              = "ayushlodh26@gmail.com"  # used only in the API User-Agent header
BASE_URL           = "https://api.openalex.org"
HEADERS            = {"User-Agent": f"al-folio-fetcher/1.0 (mailto:{EMAIL})"}

if not OPENALEX_AUTHOR_ID:
    raise SystemExit(
        "Set OPENALEX_AUTHOR_ID at the top of scripts/fetch_publications.py first "
        "(search your name at https://openalex.org to find it)."
    )

# Papers to highlight on homepage (selected: true) — matched against titles
SELECTED_TITLES_KEYWORDS = []

# Sources considered as preprint servers (lower priority)
PREPRINT_SOURCES = {"arxiv", "ssrn", "biorxiv", "medrxiv", "researchsquare"}

# Manual link overrides keyed by cite-key (last_name + year + first_title_word).
# OpenAlex often lacks the arXiv id / open-access PDF, so supply them here.
#   "arxiv": arXiv id  -> renders an "arXiv" button (links to arxiv.org/abs/<id>)
#   "pdf":   filename in assets/pdf/  -> renders a "PDF" button (self-hosted)
# These survive re-runs of this script; do NOT hand-edit papers.bib for links.
MANUAL_LINKS = {
    # "lastname2024example": {"arxiv": "2101.00001"},
    # "lastname2023other":   {"pdf": "my_paper.pdf"},
}
# ─────────────────────────────────────────────────────────────────────────────


def fetch_all_works(author_id: str) -> list:
    """Fetch all works for this author, handling pagination."""
    works = []
    base_params = (
        f"?filter=author.id:{author_id}"
        f"&sort=publication_year:desc"
        f"&per_page=100"
        f"&select=id,title,authorships,publication_year,primary_location,"
        f"doi,type,biblio,open_access,best_oa_location,ids,abstract_inverted_index"
    )
    url = f"{BASE_URL}/works{base_params}"
    page = 1
    while url:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("results", [])
        works.extend(batch)
        print(f"  Page {page}: fetched {len(batch)} works (total: {len(works)})")
        cursor = data.get("meta", {}).get("next_cursor")
        if cursor:
            url = f"{BASE_URL}/works{base_params}&cursor={cursor}"
            page += 1
            time.sleep(0.2)
        else:
            break
    return works


def normalize_title(title: str) -> str:
    """Normalize title for deduplication comparison."""
    if not title:
        return ""
    t = title.lower()
    t = re.sub(r"[^a-z0-9\s]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def is_preprint(work: dict) -> bool:
    """Return True if this work is a preprint (arXiv, SSRN, etc.)."""
    loc = work.get("primary_location") or {}
    source = loc.get("source") or {}
    source_name = (source.get("display_name") or "").lower()
    doi = (work.get("doi") or "").lower()

    for ps in PREPRINT_SOURCES:
        if ps in source_name:
            return True
    if "10.48550" in doi:  # arXiv DOI prefix
        return True
    if "10.2139" in doi:   # SSRN DOI prefix
        return True
    if work.get("type") == "preprint":
        return True
    return False


def deduplicate_works(works: list) -> list:
    """
    For each group of works with the same normalized title,
    keep only the best one — preferring published over preprint.
    """
    groups: dict[str, list] = {}
    for work in works:
        key = normalize_title(work.get("title", ""))
        if not key:
            continue
        groups.setdefault(key, []).append(work)

    deduped = []
    for key, group in groups.items():
        if len(group) == 1:
            deduped.append(group[0])
            continue

        published = [w for w in group if not is_preprint(w)]
        preprints  = [w for w in group if is_preprint(w)]

        if published:
            def venue_score(w):
                loc = w.get("primary_location") or {}
                source = loc.get("source") or {}
                name = source.get("display_name") or ""
                return 2 if name else 1

            best = max(published, key=lambda w: (venue_score(w), w.get("publication_year", 0)))
            deduped.append(best)
            removed = [w.get("title") for w in group if w is not best]
            print(f"  [dedup] Kept: '{best.get('title')}' | Removed duplicates: {len(removed)}")
        else:
            best = max(preprints, key=lambda w: w.get("publication_year", 0))
            deduped.append(best)

    print(f"\n✅ After deduplication: {len(deduped)} unique works (from {len(works)} total)")
    return deduped


def reconstruct_abstract(inverted_index) -> str:
    if not inverted_index:
        return ""
    positions = {}
    for word, pos_list in inverted_index.items():
        for p in pos_list:
            positions[p] = word
    if not positions:
        return ""
    return " ".join(positions[i] for i in sorted(positions))


def clean_latex(text: str) -> str:
    if not text:
        return ""
    replacements = [
        ("&", r"\&"), ("%", r"\%"), ("$", r"\$"),
        ("#", r"\#"), ("_", r"\_"), ("{", r"\{"), ("}", r"\}"),
        ("~", r"\textasciitilde{}"), ("^", r"\^{}"),
    ]
    for old, new in replacements:
        text = text.replace(old, new)
    return text


def make_cite_key(work: dict, index: int) -> str:
    year = work.get("publication_year", "0000")
    title = work.get("title", "")
    words = re.sub(r"[^a-zA-Z\s]", "", title).split()
    title_part = words[0].lower() if words else f"work{index}"
    authorships = work.get("authorships", [])
    last_name = "das"
    if authorships:
        display = authorships[0].get("author", {}).get("display_name", "Das")
        parts = display.split()
        last_name = parts[-1].lower() if parts else "das"
    return f"{last_name}{year}{title_part}"


def format_authors(authorships: list) -> str:
    names = []
    for a in authorships:
        display = a.get("author", {}).get("display_name", "")
        if not display:
            continue
        parts = display.strip().split()
        if len(parts) >= 2:
            last = parts[-1]
            first = " ".join(parts[:-1])
            names.append(f"{last}, {first}")
        else:
            names.append(display)
    return " and ".join(names)


def get_venue(work: dict):
    loc = work.get("primary_location") or {}
    source = loc.get("source") or {}
    venue_name = source.get("display_name", "")
    work_type = work.get("type", "article")
    if work_type in ("proceedings-article", "paper-conference"):
        return venue_name, "inproceedings"
    if work_type == "preprint":
        return venue_name, "misc"
    return venue_name, "article"


def is_selected(title: str) -> bool:
    return any(kw.lower() in title.lower() for kw in SELECTED_TITLES_KEYWORDS)


def work_to_bibtex(work: dict, index: int) -> str:
    cite_key  = make_cite_key(work, index)
    title     = work.get("title", "Untitled")
    year      = work.get("publication_year", "")
    authors   = format_authors(work.get("authorships", []))
    venue, bib_type = get_venue(work)
    doi       = work.get("doi", "") or ""
    if doi.startswith("https://doi.org/"):
        doi = doi[len("https://doi.org/"):]

    arxiv_id = work.get("ids", {}).get("arxiv", "") or ""
    if arxiv_id.startswith("https://arxiv.org/abs/"):
        arxiv_id = arxiv_id[len("https://arxiv.org/abs/"):]

    oa = work.get("best_oa_location") or {}
    pdf_url = oa.get("pdf_url", "") or ""

    # Apply manual link overrides (arXiv id and/or self-hosted PDF filename).
    override = MANUAL_LINKS.get(cite_key, {})
    if override.get("arxiv"):
        arxiv_id = override["arxiv"]
    pdf_file = override.get("pdf", "")

    abstract = reconstruct_abstract(work.get("abstract_inverted_index"))
    abstract = clean_latex(abstract)
    selected = "true" if is_selected(title) else "false"

    biblio = work.get("biblio") or {}
    volume = biblio.get("volume", "") or ""
    issue  = biblio.get("issue", "") or ""
    pages  = ""
    if biblio.get("first_page") and biblio.get("last_page"):
        pages = f"{biblio['first_page']}--{biblio['last_page']}"

    lines = [f"@{bib_type}{{{cite_key},"]
    lines.append(f"  title     = {{{{{clean_latex(title)}}}}},")
    lines.append(f"  author    = {{{authors}}},")
    lines.append(f"  year      = {{{year}}},")

    if bib_type == "article":
        lines.append(f"  journal   = {{{{{clean_latex(venue)}}}}},")
        if volume: lines.append(f"  volume    = {{{volume}}},")
        if issue:  lines.append(f"  number    = {{{issue}}},")
        if pages:  lines.append(f"  pages     = {{{pages}}},")
    elif bib_type == "inproceedings":
        lines.append(f"  booktitle = {{{{{clean_latex(venue)}}}}},")
        if pages:  lines.append(f"  pages     = {{{pages}}},")

    if doi:      lines.append(f"  doi       = {{{doi}}},")
    if arxiv_id: lines.append(f"  arxiv     = {{{arxiv_id}}},")
    if pdf_file: lines.append(f"  pdf       = {{{pdf_file}}},")
    if pdf_url:  lines.append(f"  html      = {{{pdf_url}}},")
    if abstract: lines.append(f"  abstract  = {{{abstract}}},")

    lines.append(f"  selected  = {{{selected}}},")
    lines.append(f"  bibtex_show = {{true}},")
    lines.append("}")
    return "\n".join(lines)


def main():
    print("🔍 Fetching publications from OpenAlex...")
    print(f"   Author ID: {OPENALEX_AUTHOR_ID}\n")

    print("📚 Fetching works...")
    works = fetch_all_works(OPENALEX_AUTHOR_ID)
    print(f"\n📄 Total works fetched: {len(works)}")

    print("\n🔧 Deduplicating preprints vs published versions...")
    works = deduplicate_works(works)

    works.sort(key=lambda w: w.get("publication_year", 0), reverse=True)

    if not works:
        print("⚠️  No works found.")
        return

    bib_entries = [work_to_bibtex(w, i) for i, w in enumerate(works)]

    header = (
        "% ─────────────────────────────────────────────────────────────────\n"
        "% papers.bib  —  auto-generated by fetch_publications.py\n"
        "% Source: OpenAlex API (https://api.openalex.org)\n"
        f"% OpenAlex Author ID: {OPENALEX_AUTHOR_ID}\n"
        "% DO NOT EDIT MANUALLY — re-run the script or GitHub Action to refresh\n"
        "% ─────────────────────────────────────────────────────────────────\n\n"
    )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(header + "\n\n".join(bib_entries), encoding="utf-8")
    print(f"\n✅ Written {len(bib_entries)} unique entries to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
