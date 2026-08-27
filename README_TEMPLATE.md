# Portfolio README Template

Use this when creating or updating a project README in this monorepo.
The portfolio site (`apexcodex`) reads **only specific parts** of each README — not the full file.

---

## What the site pulls vs what stays on GitHub

| Source in README | Where it shows on the portfolio site |
|------------------|--------------------------------------|
| `title` (frontmatter) | Project title on home list + detail page |
| `subtext` (frontmatter) | One-liner under the title on the home list |
| `order` (frontmatter) | Sort order inside the TypeScript accordion |
| `## Portfolio` section | Main body on the detail page (include `### Usage` / code blocks inside) |
| `## Usage`, `## Quick start`, `## Library` | Also merged into the detail page as skim content |
| `stack`, `date`, `contribution`, `extent` (frontmatter) | Metadata rows on the detail page |
| `liveUrl` (frontmatter) | "Live Site" link (if set) |
| GitHub folder URL | "GitHub" link (auto-generated from repo path) |
| `## Development`, `## Stack`, `## API`, etc. | Collapsed "Technical details" when `summary-collapsible` |

Everything under `## Development` and beyond is for GitHub readers unless you use `summary-collapsible`.

---

## Copy-paste template

```markdown
---
# ── HOME LIST ──────────────────────────────────
title: Project Name              # detail page heading
subtext: One-line summary.       # shown under title on home
order: 1                         # position in TypeScript accordion (1, 2, 3…)

# ── DETAIL PAGE METADATA ─────────────────────
date: Jan 2026                   # optional — falls back to last git commit
contribution: Solo Developer
extent: [Develop]
stack: [Next.js, TypeScript]
category: Personal
liveUrl:                         # optional live demo URL

# ── HOW MUCH TO SHOW ON PORTFOLIO ────────────
portfolioMode: summary
#   summary              → show ## Portfolio + metadata + GitHub
#   metadata-only        → metadata + GitHub only (no body text)
#   summary-collapsible  → ## Portfolio + collapsed technical block

detailsCollapsed: true         # only for summary-collapsible (default: closed)
---

# folder-name

## Portfolio
<!-- ✓ SHOWN on portfolio — short pitch + skim usage (one screen max) -->

Your pitch. What it does.

### Usage

```bash
pnpm dev
```

## Development
<!-- ✗ Collapsed on portfolio if summary-collapsible — full docs for GitHub -->

Setup commands, usage, API docs, tests — write as much as you need here.
```

---

## Current TypeScript projects (for reference)

| Folder | `title` | `order` | `portfolioMode` |
|--------|---------|---------|-----------------|
| `nihon-main` | Nihon | 1 | `summary` |
| `Conrad-reader` | Conrad Reader | 2 | `summary` |
| `key-warriors` | Keyboard Warriors | 3 | `summary-collapsible` |

---

## Rules of thumb

1. **Keep `## Portfolio` short** — aim for one screen on the site, no long scroll.
2. **Put all technical depth in `## Development`** — safe to be as long as you want.
3. **Use `metadata-only`** when the project speaks for itself (e.g. a small library).
4. **Use `summary-collapsible`** when you want a teaser + optional expand for curious visitors.
5. After editing, push to GitHub — the portfolio refreshes within ~1 hour (or immediately in local dev with `GITHUB_LOCAL_REPOS_PATH`).
