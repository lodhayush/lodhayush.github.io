# Remaining to-dos

The site is fully populated for **Ayush Lodh** — identity, socials, publications,
news, projects, photo, CV page + PDF download, and the custom domain. The CV
details in `_data/cv.yml` were filled in from `assets/pdf/Ayush_Lodh_CV.pdf`.

## Verify before pushing live

- [ ] **ECML PKDD 2026 news item** (`_data/news.yml`) — the NoTeS-Bank acceptance
      was taken from a coauthor's announcement and could not be re-verified against
      public sources; confirm it is real before the site goes live.
- [ ] **News dates** (`_data/news.yml`) — the "Started my Master's" (2025-08-01)
      and "Started a remote research internship at CVC" (2025-12-01) items use
      approximate days; adjust if you want exact dates.
- [ ] **CV wording** (`_data/cv.yml`) — filled from the CV PDF; double-check the
      CGPA lines and the language-fluency labels (English/Hindi listed as
      "Fluent", which the CV does not state explicitly).
- [ ] **Bio** (`_pages/about.md`) — drafted from public records and the CV; have
      Ayush read and adjust, including the "Research at a Glance" chart values.

## Optional polish

- [ ] **Project images** — add paper figures to `assets/img/` and set the `img:`
      field in `_projects/1_project.md` / `2_project.md`; publication thumbnails
      go in `assets/img/publication_preview/` (add a `preview=` field to entries
      in `_bibliography/papers.bib`).
- [ ] **Google Analytics** — set `google_analytics:` in `_config.yml` and flip
      `enable_google_analytics: true`.
- [ ] The **Fetch Publications** workflow can regenerate `papers.bib` from
      OpenAlex (Ayush's author ID is already configured in
      `scripts/fetch_publications.py`), but the current `papers.bib` is
      hand-curated and more accurate — leave the workflow's schedule commented
      out unless you prefer automation.

## Deploy status (as of 2026-07-19)

1. ✅ Repo `lodhayush/lodhayush.github.io` created; site pushed to `main`.
2. ✅ Every push to `main` builds and deploys straight to GitHub Pages via
   Actions (Settings → Pages source shows "GitHub Actions", configured
   automatically by the deploy workflow — no branch setup needed).
3. ✅ Served at the free GitHub Pages URL **https://lodhayush.github.io**
   (no custom domain — the `CNAME` file was removed and `url:` in
   `_config.yml` points at the github.io address).

> Using a custom domain later? Re-add a `CNAME` file with the domain, set
> `url:` to match, add the DNS records at the registrar, and enable it under
> Settings → Pages.

## Notes

- The CV PDF lives at `assets/pdf/Ayush_Lodh_CV.pdf`; the download icon on the
  /cv/ page comes from the `cv_pdf:` line in `_pages/cv.md`.
- Ayush's phone number and street address appear in the CV PDF but were
  **deliberately left out** of the website pages (`_data/cv.yml` lists only
  city-level location). The PDF itself is public once deployed — swap in a
  redacted version if that is a concern.
- Citation counts auto-update 3×/week from Google Scholar via
  `.github/workflows/update-citations.yml` (already enabled — Scholar ID is
  configured).
- The Blog page was removed by design. Books/Teaching/People theme pages were
  removed too; restore them from [al-folio](https://github.com/alshedivat/al-folio)
  if ever needed.
- The profile photo renders as a small circular avatar (rule in
  `_sass/_components.scss`); set `image_circular: false` in `_pages/about.md`
  to switch back to the large rectangular style.
