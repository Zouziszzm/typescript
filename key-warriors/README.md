# Keyboard Warriors

Collaborative turn-based typing for 2–3 players. One paragraph, alternating words, shared WPM/accuracy score — Monkeytype-inspired modes with live spectator keystrokes.

## Stack

| Layer | Tech |
|-------|------|
| App | Next.js 15 (App Router) + TypeScript + Tailwind — deploy on **Vercel** |
| Auth | Auth.js (NextAuth v5) — Google + GitHub |
| DB | PostgreSQL via Prisma (local Docker / Neon / AWS RDS free tier) |
| Real-time | WebSocket — local Node server for dev; **AWS API Gateway + Lambda + DynamoDB** for prod |

## Monorepo layout

```
apps/web              Next.js UI + REST API
packages/shared       Types, WS protocol, scoring (Zod)
services/ws-lambda    AWS Lambda handlers + local WS server
infra/                AWS SAM template
```

## Quick start (local)

### 1. Install

```bash
pnpm install
pnpm --filter @key-warriors/shared build
```

### 2. Environment

Copy `.env.example` to `apps/web/.env.local` and fill in values.

**Neon (connected):** Project `keyboard-wars` (`damp-sound-81133860`, ap-southeast-1).

```bash
# Get connection string
neonctl connection-string --project-id damp-sound-81133860

# Auth URL from Neon Console → Auth → Configuration
NEON_AUTH_BASE_URL=https://ep-flat-hill-az1dhxyg.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=$(openssl rand -base64 32)
```

With `ALLOW_DEV_AUTH=true`, `/play` auto-signs you in locally (no login screen).

### Resend email (instead of Neon shared mail)

Neon Auth verification/reset emails are sent through **Resend SMTP**:

1. Add to `apps/web/.env.local`:
   - `RESEND_API_KEY` — from [Resend API Keys](https://resend.com/api-keys)
   - `EMAIL_FROM` — `onboarding@resend.dev` for testing, or `auth@yourdomain.com` after you verify a domain in Resend

2. Apply to Neon Auth:
```bash
source apps/web/.env.local
./scripts/configure-resend-email.sh
```

Or in **Neon Console → Auth → Settings → Custom SMTP**:
| Field | Value |
|-------|--------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key (`re_...`) |
| From | your verified sender address |

### 3. Database

```bash
cd apps/web && source .env.local && pnpm db:push
```

### 4. Run app + WebSocket

```bash
# Easiest — both servers in one terminal (required for multiplayer)
pnpm dev:all
```

Or in two terminals:

```bash
# Terminal 1 — Next.js
pnpm dev

# Terminal 2 — WebSocket (must run on the host Mac for LAN play)
pnpm dev:ws
```

Open [http://localhost:3000](http://localhost:3000). Solo practice works without OAuth. Multiplayer needs sign-in (configure Google/GitHub OAuth apps) and the WS server.

### Play on your LAN (phone / another PC)

1. Run **both** terminals above on your Mac (`pnpm dev` + `pnpm dev:ws`).
2. On the other device, open `http://<your-mac-lan-ip>:3000` (e.g. `http://192.168.1.11:3000` — shown as **Network** when Next starts).
3. Keep `NEXT_PUBLIC_WS_URL=ws://localhost:3001` in `.env.local` — the browser automatically connects to `ws://<same-lan-ip>:3001` when not on localhost.
4. Each player can play as a **guest** (no sign-in) or use their own account.
5. Allow ports **3000** and **3001** through your Mac firewall if connections fail.

For local auth without real OAuth, you can add credentials later; until then use practice mode and set providers when ready.

### 5. Tests

```bash
pnpm --filter @key-warriors/shared test
```

## Deploy

### Vercel (Next.js)

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `apps/web`.
3. Add env vars from `.env.example` (`DATABASE_URL`, `NEXTAUTH_*`, OAuth, `NEXT_PUBLIC_WS_URL`, `INTERNAL_API_SECRET`).
4. Use Neon (or RDS) for `DATABASE_URL` in production.

### AWS WebSocket

```bash
pnpm --filter @key-warriors/ws-lambda bundle
cd infra
sam build
sam deploy --guided
```

Set `NEXT_PUBLIC_WS_URL` to the stack output `WebSocketURI`, and point `VERCEL_WEBHOOK_URL` at `https://your-app.vercel.app/api/internal/match-complete` with a matching `INTERNAL_API_SECRET`.

## AWS free tier notes

- **Vercel Hobby** hosts the Next.js app (recommended; do not put Next on EC2 for this project).
- **RDS PostgreSQL** `db.t4g.micro`: ~12 months free tier, then ~$15–20/mo — or use **Neon** free forever.
- **API Gateway WebSocket + Lambda + DynamoDB**: typically $0 at hobby traffic (Lambda 1M req/mo free; DynamoDB 25 GB free forever).

## Game rules (v1)

1. Room needs **2–3** authenticated players.
2. Host picks mode (time / words / quote / custom); everyone ready-ups.
3. 3–2–1 countdown, then seat 0 types word 0, seat 1 types word 1, etc.
4. Spectators see the active player’s keystrokes live.
5. Team WPM = `(correctChars / 5) / minutes`; accuracy aggregated across players.
6. Results persist to PostgreSQL + leaderboard.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server |
| `pnpm dev:ws` | WebSocket server (port 3001) — **required for rooms** |
| `pnpm dev:all` | Next.js + WebSocket together |
| `pnpm build` | Build all packages |
| `pnpm db:push` | Prisma db push |
| `pnpm --filter @key-warriors/ws-lambda start:local` | Local WebSocket |
