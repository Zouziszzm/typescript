---
title: Nihon
subtext: Interactive Japanese study app — kana and kanji grids, tokenized sentences, and cloud TTS with natural pronunciation.
order: 1
portfolioMode: summary
date: Feb 2026
stack: [Next.js, TypeScript, Tailwind CSS, GSAP]
extent: [Develop]
contribution: Solo Developer
category: Personal
---

# Nihon (日本)

## Portfolio

**Nihon** is an interactive web app for learning Japanese — built for my own study workflow and designed to feel premium rather than textbook-dry. Hiragana, katakana, and kanji each get a styled grid you can explore character by character; clicking opens readings, stroke counts, and vocabulary examples.

Example sentences are tokenized and deeply interactive. Hover any word or particle to see its translation and part of speech in context — not as a static gloss block, but as something you can probe while reading. Cloud TTS reads sentences aloud with natural Japanese pronunciation and proper pitch accents, so listening practice stays tied to the text you're studying.

The UI is dark-mode first with custom CSS and Tailwind, GSAP micro-animations, and Lucide icons. Grammar and kanji routes are in progress; kana is the most complete surface today.

I built this to replace scattered Anki decks and dictionary tabs with one focused study environment I actually enjoy opening.

### Usage

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 — you'll land on the kana grid.

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

**Tech stack:** Next.js (App Router), TypeScript, Tailwind CSS, GSAP, Lucide React.

Character data lives in `src/store/` (`kana-data.json`, `kanji-data.json`, `dictionary.json`). TTS is served through a Next.js API route at `/api/tts`.

> This application is actively under construction — features are being added incrementally.
