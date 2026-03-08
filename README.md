# Closest Without Going Over

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

## Important note

The original spec recommends Neon/Postgres + Drizzle. This repo currently uses a local file-backed store at `.data/cwogo-store.json` so the app can run immediately without external infrastructure.

## Getting started

Install dependencies:

```bash
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000/cwogo
```

## How to play locally

Use separate browser contexts because sessions are cookie-based.

- Host: normal browser window
- Players: incognito windows, another browser, or other devices

Basic flow:

1. Create a room from `/cwogo`.
2. Join from `/cwogo/join/[code]` in a different browser context.
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

## Reset local game data

Stop the server and remove the local store:

```bash
rm -f .data/cwogo-store.json
```

## Validation

Available checks:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Project structure

```text
src/app/cwogo/                    UI routes
src/app/api/cwogo/               Route handlers
src/components/cwogo/            Host/player UI
src/hooks/                       Polling and mutations
src/lib/cwogo/                   Game logic, auth, serializers, store
src/types/cwogo.ts               Shared types
docs/001-spec.md                 Product and implementation spec
```
