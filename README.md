# Inkling

Multiplayer estimation game built from the spec in [`docs/001-spec.md`](./docs/001-spec.md).

Players join a room, submit secret numeric guesses, and the host reveals the round after lock. The winner is the closest guess that does not go over.

## Current implementation

- Next.js App Router
- TypeScript
- Tailwind CSS
- TanStack Query polling
- Opaque cookie sessions for host and players
- Server-authoritative round lifecycle and scoring
- Role-aware state responses so guesses stay hidden before reveal
- Neon Postgres via `DATABASE_URL`

## Database setup

This app now uses a single Postgres database for both local development and Vercel deployments.

The simplest workflow is:

1. Link the repo to Vercel
2. Provision Neon through the Vercel Marketplace
3. Pull env vars locally with `vercel env pull .env.local`

The app reads `DATABASE_URL`.

## Shared database workflow

Local development and the deployed app both talk to the same Neon database unless you deliberately point `DATABASE_URL` somewhere else.

That means:

- local testing creates real shared room state
- resetting data affects the deployed app too
- it is safer to test in disposable rooms than to clear the database casually

## Important note

The runtime is backed by Postgres now, but the persistence model is still a single transactional store row in Postgres rather than the fully normalized Drizzle schema described in the original spec. That keeps the deployment path simple while preserving server-authoritative behavior.

## Getting started

Install dependencies:

```bash
pnpm install
```

Start the dev server:

```bash
vercel env pull .env.local
pnpm dev
```

Open:

```text
http://localhost:3000/inkling
```

## How to play locally

Use separate browser contexts because sessions are cookie-based.

- Host: normal browser window
- Players: incognito windows, another browser, or other devices

Basic flow:

1. Create a room from `/inkling`.
2. Join from `/inkling/join/[code]` in a different browser context.
3. Start a round on the host screen.
4. Submit a guess from the player screen.
5. Lock and reveal from the host screen.
6. Start the next round.

## Testing manually

Good smoke tests:

1. Normal round with one host and one player
2. Player updates a guess before lock
3. Exact match
4. Everyone busts
5. No submissions
6. Two players tie with the same winning value

The host should only see submission status before reveal, never raw guesses.

## Running on phones on the same network

For device testing:

```bash
pnpm build
pnpm start --hostname 0.0.0.0 --port 3000
```

Then open your machine's LAN IP from the phone.

## Reset database state

Because state lives in Neon now, resetting data means clearing database contents rather than deleting a local file.

At the moment, the app auto-creates one table named `game_state`.

If you need a hard reset, delete rows from that table intentionally against the configured `DATABASE_URL`.

## Validation

Available checks:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Project structure

```text
src/app/inkling/                    UI routes
src/app/api/inkling/               Route handlers
src/components/game/            Host/player UI
src/hooks/                       Polling and mutations
src/lib/game/                   Game logic, auth, serializers, store
src/types/game.ts               Shared types
docs/001-spec.md                 Product and implementation spec
```
