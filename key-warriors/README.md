---
title: Keyboard Warriors
subtext: Turn-based multiplayer typing for 2–3 players — alternating words, shared WPM/accuracy, live spectator keystrokes, and Hardcore mode.
order: 3
portfolioMode: summary-collapsible
detailsCollapsed: true
date: Aug 2026
stack: [Next.js, TypeScript, PostgreSQL, WebSocket, AWS Lambda]
extent: [Develop]
contribution: Solo Developer
category: Personal
---

# Keyboard Warriors

## Portfolio

**Keyboard Warriors** is a collaborative turn-based typing game for 2–3 players. One paragraph, alternating words — you type a word, your partner types the next. Team WPM and accuracy are scored together, Monkeytype-style modes included, and spectators see the active player's keystrokes live.

Rooms are created with a short code; guests can join without an account on LAN. Host picks the mode (time, words, quote, custom), everyone readies up, a 3–2–1 countdown fires, and seats take turns word by word. Results persist to PostgreSQL and feed a leaderboard. **Hardcore mode** locks mistakes behind a lives system for players who want pressure.

The stack is a pnpm monorepo: Next.js 15 on Vercel for the UI and REST API, Auth.js for Google/GitHub sign-in, Prisma + PostgreSQL (Neon locally), and a WebSocket layer — Node in dev, AWS API Gateway + Lambda + DynamoDB in production.

I built this to explore real-time multiplayer on a hobby budget: Vercel for the app, SAM for the socket infra, and a shared scoring package both sides trust.

### Quick start

```bash
pnpm install
pnpm --filter @key-warriors/shared build
pnpm dev:all
```

Open http://localhost:3000. Solo practice works without OAuth; multiplayer needs sign-in and the WS server running.

## Development

### Stack

| Layer | Tech |
|-------|------|
| App | Next.js 15 (App Router) + TypeScript + Tailwind — deploy on **Vercel** |
| Auth | Auth.js (NextAuth v5) — Google + GitHub |
| DB | PostgreSQL via Prisma (local Docker / Neon / AWS RDS free tier) |
| Real-time | WebSocket — local Node server for dev; **AWS API Gateway + Lambda + DynamoDB** for prod |

### Monorepo layout

```
apps/web              Next.js UI + REST API
packages/shared       Types, WS protocol, scoring (Zod)
services/ws-lambda    AWS Lambda handlers + local WS server
infra/                AWS SAM template
```

### Environment

Copy `.env.example` to `apps/web/.env.local` and fill in values.

With `ALLOW_DEV_AUTH=true`, `/play` auto-signs you in locally (no login screen).

### Database

```bash
cd apps/web && source .env.local && pnpm db:push
```

### Play on your LAN

1. Run `pnpm dev:all` on your Mac.
2. On another device, open `http://<your-mac-lan-ip>:3000`.
3. Keep `NEXT_PUBLIC_WS_URL=ws://localhost:3001` in `.env.local` — the browser connects to `ws://<same-lan-ip>:3001` when not on localhost.
4. Allow ports **3000** and **3001** through your Mac firewall if connections fail.

### Tests

```bash
pnpm --filter @key-warriors/shared test
```

### Deploy

**Vercel (Next.js):** import the repo, set Root Directory to `apps/web`, add env vars from `.env.example`.

**AWS WebSocket:**

```bash
pnpm --filter @key-warriors/ws-lambda bundle
cd infra && sam build && sam deploy --guided
```

Set `NEXT_PUBLIC_WS_URL` to the stack output `WebSocketURI`.

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server |
| `pnpm dev:ws` | WebSocket server (port 3001) |
| `pnpm dev:all` | Next.js + WebSocket together |
| `pnpm build` | Build all packages |
| `pnpm db:push` | Prisma db push |
