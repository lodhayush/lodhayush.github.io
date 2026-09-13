# Remaining to-dos

The site is fully populated for **Ayush Lodh** — identity, socials, publications,
news, projects, photo, CV page + PDF download, and the custom domain. The CV
details in `_data/cv.yml` were filled in from `assets/pdf/Curriculum_Vitae.pdf`.

## Verify before pushing live

- [x] **ECML PKDD 2026 news item** (`_data/news.yml`) — confirmed: NoTeS-Bank is
      in the ECML PKDD 2026 proceedings (DOI 10.1007/978-3-032-37676-3_40).
- [ ] **News dates** (`_data/news.yml`) — the "Started my Master's" (2025-08-01)
      and "Started a remote research internship at CVC" (2025-12-01) items use
      approximate days; adjust if you want exact dates.
- [ ] **CV wording** (`_data/cv.yml`) — filled from the CV PDF; double-check the
      CGPA lines and the language-fluency labels (English/Hindi listed as
      "Fluent", which the CV does not state explicitly).
- [ ] **Bio** (`_pages/about.md`) — drafted from public records and the CV; have
      Ayush read and adjust, including the "Research at a Glance" chart values.

## Optional polish

- [x] **Project images** — card thumbnails and figures are in `assets/img/`
      (Chunks to Graphs and ACPR figures cropped from the papers; NoTeS-Bank and
      HNU figures from alloydas.github.io). The source paper PDFs live outside
      the repo in `D:\Papers\` and must not be committed (`/*.pdf` is in
      `.gitignore`). Publication thumbnails
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

- The CV PDF lives at `assets/pdf/Curriculum_Vitae.pdf`; the download icon on the
  /cv/ page comes from the `cv_pdf:` line in `_pages/cv.md`.
- Research interests live on the **CV page** (`Interests:` section at the end of
  `_data/cv.yml`), not on the About page.
- The About page's **Publication Timeline** chart counts papers per year from
  `_bibliography/papers.bib` on every build (`_plugins/pub-stats.rb`), so it
  never needs editing.
- Ayush's phone number and street address appear in the CV PDF but were
  **deliberately left out** of the website pages (`_data/cv.yml` lists only
  city-level location). The PDF itself is public once deployed — swap in a
  redacted version if that is a concern.
- **Google Scholar sync:** `.github/workflows/update-citations.yml` runs
  `bin/update_scholar.py` daily (and on pushes that touch `papers.bib` or the
  script). It reads the public Scholar profile (`scholar_userid` in
  `_config.yml`), writes counts to `_data/citations.yml` for the
  `google_scholar` badge, tags `papers.bib` entries with `google_scholar_id`,
  and appends any Scholar paper missing from `papers.bib`. Then it commits and
  starts the deploy, because pushes made with `GITHUB_TOKEN` don't trigger it.
  Scholar has no API or notifications, so "automatic" means daily polling.
- **Review auto-added papers:** entries the sync appends come from Scholar's
  metadata. Check the venue name, `abbr` badge, and author spelling, and add
  `selected={true}` / `arxiv=` / `abstract=` by hand. The About page venues pie
  chart and news are **not** updated automatically (the timeline chart is).
- **If the sync run goes red**, Google Scholar blocked the GitHub runner
  (CAPTCHA/429). Nothing is overwritten, and the last good counts stay live.
  Occasional red runs are expected. If every run fails, Scholar is blocking
  GitHub's IPs outright; a paid API such as SerpAPI would be the fix.
- The **Repositories** page renders cards with GitHub's own OpenGraph card
  service (`opengraph.githubassets.com`). The theme originally used
  github-readme-stats and github-profile-trophy, but their public demo
  instances are paused/disabled (503 and 402), and `_config.yml` was also
  missing the `external_services` block those includes need — so every card was
  a broken image. Trophies are disabled for the same reason. To restore the
  original look, self-host github-readme-stats and set
  `external_services.github_readme_stats_url` in `_config.yml`.
- Add repos to show by listing them under `github_repos:` in
  `_data/repositories.yml`.
- The Blog page was removed by design. Books/Teaching/People theme pages were
  removed too; restore them from [al-folio](https://github.com/alshedivat/al-folio)
  if ever needed.
- The profile photo renders as a small circular avatar (rule in
  `_sass/_components.scss`); set `image_circular: false` in `_pages/about.md`
  to switch back to the large rectangular style.
