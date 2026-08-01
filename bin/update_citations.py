#!/usr/bin/env python
"""
update_citations.py
───────────────────
Refreshes _data/citations.yml with per-paper citation counts.

Why not Google Scholar? Scholar has no public API, so the previous script
scraped it via `scholarly`. Google blocks datacenter IPs, so that scrape
fails almost every time it runs on a GitHub Actions runner — the counts
never populated. This script instead queries proper APIs that are happy to
serve CI runners:

    * OpenAlex  (https://api.openalex.org)  — no API key, generous limits
    * Crossref  (https://api.crossref.org)  — no API key, DOI-based

Each paper in _bibliography/papers.bib is looked up by DOI, then by arXiv
ID, then by title. Every source that answers contributes a count and the
highest one wins (indexes disagree; the max is the closest honest analogue
to Scholar's merged count, and never inflates beyond a real source).

Output is keyed by BibTeX cite key, which _layouts/bib.liquid reads as
`site.data.citations.papers[entry.key]`.

Usage:
    python bin/update_citations.py

Requires: requests, pyyaml
"""

import re
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
import yaml

BIB_PATH = Path("_bibliography/papers.bib")
OUTPUT_PATH = Path("_data/citations.yml")
EMAIL = "ayushlodh26@gmail.com"  # identifies us politely to the APIs
HEADERS = {"User-Agent": f"al-folio-citations/1.0 (mailto:{EMAIL})"}
TIMEOUT = 30
RETRIES = 3


def get_json(url: str, params: dict | None = None):
    """GET with retries and backoff. Returns parsed JSON, or None on failure.

    A 404 means "this source doesn't have the paper" — a normal answer, not
    an error, so it returns immediately without burning retries.
    """
    for attempt in range(1, RETRIES + 1):
        try:
            resp = requests.get(
                url, params=params, headers=HEADERS, timeout=TIMEOUT
            )
            if resp.status_code == 404:
                return None
            if resp.status_code == 429 or resp.status_code >= 500:
                raise requests.HTTPError(f"HTTP {resp.status_code}")
            resp.raise_for_status()
            return resp.json()
        except Exception as e:  # network error, rate limit, bad JSON
            if attempt == RETRIES:
                print(f"      ! giving up on {url}: {e}")
                return None
            wait = 2**attempt
            print(f"      … retry {attempt}/{RETRIES - 1} in {wait}s ({e})")
            time.sleep(wait)
    return None


def parse_bib(path: Path) -> list[dict]:
    """Extract cite key, title, year, DOI and arXiv id from each bib entry.

    Deliberately a light regex parse: papers.bib is hand-curated and small,
    and this avoids adding a BibTeX parser dependency to CI.
    """
    if not path.exists():
        print(f"❌ {path} not found — nothing to look up.")
        sys.exit(1)

    text = path.read_text(encoding="utf-8")
    entries = []
    for match in re.finditer(r"@(\w+)\s*\{\s*([^,]+),(.*?)\n\}", text, re.S):
        body = match.group(3)

        def field(name: str) -> str:
            m = re.search(rf"\b{name}\s*=\s*\{{(.*?)\}},?\s*\n", body, re.S)
            if not m:
                return ""
            # collapse whitespace and strip any nested braces from {{Title}}
            return re.sub(r"\s+", " ", m.group(1)).replace("{", "").replace("}", "").strip()

        entries.append(
            {
                "key": match.group(2).strip(),
                "title": field("title"),
                "year": field("year"),
                "doi": field("doi"),
                "arxiv": field("arxiv") or field("eprint"),
            }
        )
    return entries


def openalex_count(entry: dict) -> int | None:
    """Look up a work on OpenAlex by DOI, then arXiv DOI, then title."""
    candidates = []
    if entry["doi"]:
        candidates.append(f"https://api.openalex.org/works/doi:{entry['doi']}")
    if entry["arxiv"]:
        candidates.append(
            f"https://api.openalex.org/works/doi:10.48550/arXiv.{entry['arxiv']}"
        )

    best = None
    for url in candidates:
        data = get_json(url, {"select": "id,cited_by_count"})
        if data and data.get("cited_by_count") is not None:
            count = int(data["cited_by_count"])
            best = count if best is None else max(best, count)

    if best is not None:
        return best

    # Fall back to a title search when we have no usable identifier.
    if entry["title"]:
        data = get_json(
            "https://api.openalex.org/works",
            {
                "filter": f"title.search:{entry['title']}",
                "select": "id,title,cited_by_count",
                "per_page": 1,
            },
        )
        results = (data or {}).get("results") or []
        if results and results[0].get("cited_by_count") is not None:
            return int(results[0]["cited_by_count"])
    return None


def crossref_count(entry: dict) -> int | None:
    """Crossref only indexes registered DOIs (so: not arXiv preprints)."""
    if not entry["doi"]:
        return None
    data = get_json(f"https://api.crossref.org/works/{entry['doi']}")
    message = (data or {}).get("message") or {}
    count = message.get("is-referenced-by-count")
    return int(count) if count is not None else None


SOURCES = [("openalex", openalex_count), ("crossref", crossref_count)]


def main() -> None:
    print("🔍 Refreshing citation counts (OpenAlex + Crossref)\n")
    entries = parse_bib(BIB_PATH)
    if not entries:
        print(f"❌ No BibTeX entries parsed from {BIB_PATH}.")
        sys.exit(1)
    print(f"📚 {len(entries)} entries in {BIB_PATH}\n")

    papers = {}
    resolved = 0
    for entry in entries:
        title = entry["title"][:60] or entry["key"]
        print(f"  • {entry['key']} — {title}")

        counts = {}
        for name, lookup in SOURCES:
            try:
                value = lookup(entry)
            except Exception as e:  # a source misbehaving must not abort the run
                print(f"      ! {name} errored: {e}")
                value = None
            if value is not None:
                counts[name] = value
                print(f"      {name}: {value}")
            time.sleep(0.3)  # be a polite API citizen

        if not counts:
            print("      → no source had this paper; leaving it out")
            continue

        winner = max(counts, key=lambda k: counts[k])
        resolved += 1
        print(f"      → {counts[winner]} citations (via {winner})")

        papers[entry["key"]] = {
            "title": entry["title"],
            "year": entry["year"],
            "citations": counts[winner],
            "source": winner,
        }

    # Every source failing for every paper means the network or both APIs are
    # down — that is a real failure and CI should show it. A few papers simply
    # not being indexed yet is normal and must not fail the run.
    if resolved == 0:
        print("\n❌ No citation data could be retrieved for any paper.")
        sys.exit(1)

    existing = {}
    if OUTPUT_PATH.exists():
        try:
            existing = yaml.safe_load(OUTPUT_PATH.read_text(encoding="utf-8")) or {}
        except Exception as e:
            print(f"⚠️  Could not read existing {OUTPUT_PATH}: {e}")

    if existing.get("papers") == papers:
        print(f"\nℹ️  Counts unchanged for all {resolved} papers; leaving the file alone.")
        return

    header = (
        "# Auto-generated by .github/workflows/update-citations.yml — do not edit by hand.\n"
        "# Sources: OpenAlex and Crossref (Google Scholar has no API and blocks CI).\n"
        "# Keyed by BibTeX cite key from _bibliography/papers.bib.\n"
    )
    data = {
        "metadata": {"last_updated": datetime.now().strftime("%Y-%m-%d")},
        "papers": papers,
    }
    OUTPUT_PATH.write_text(
        header + yaml.dump(data, width=1000, sort_keys=True, allow_unicode=True),
        encoding="utf-8",
    )
    print(f"\n✅ Wrote {resolved} papers to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
