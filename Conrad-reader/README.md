---
title: Conrad Reader
subtext: A brutalist PWA novel reader — EPUB, PDF, MOBI, and TXT with offline library, progress tracking, and built-in dictionary.
order: 2
portfolioMode: summary
date: May 2026
stack: [Next.js, TypeScript, IndexedDB, PWA]
extent: [Develop]
contribution: Solo Developer
category: Personal
---

# Conrad-reader

## Portfolio

**Conrad Reader** is a personal novel reader built as a Next.js PWA with a brutalist, distraction-free UI. Import books in EPUB, PDF, MOBI, or plain text and read entirely in the browser — metadata, files, and reading progress live in IndexedDB so your library works offline after the first load.

Each format gets a dedicated reader: EPUB with chapter navigation and CFI-based progress, PDF via pdf.js, MOBI through a dedicated parser, and TXT with scroll-position tracking. Tap a word to look it up in a built-in dictionary popup. Collections, search, sort, and a "pile" inbox keep large libraries manageable without leaving the app.

Reading stats track daily minutes and streaks. Per-book settings cover fonts, themes, grid layout, margins, and reading modes (paginated vs scroll). A service worker and web manifest make it installable on phone and desktop — closer to a native reader than a tab you lose in the browser chrome.

I built this because I wanted one place for every ebook format I actually own, with typography I control and no sync server required.

### Usage

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000, import a book, and start reading.

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

Supported formats: `.epub`, `.pdf`, `.txt`, `.mobi`, `.azw`, `.azw3`.

Data is stored locally in IndexedDB (books, progress, collections, reading stats). Settings and data can be exported from the Data tab in Settings.
