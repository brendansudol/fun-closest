# Running Notes

Last updated: March 8, 2026

## Current status

The app is built around the spec's core constraint: server-authoritative hidden guesses until reveal.

The main flow is live now:

- room creation
- join by code
- host/player cookie sessions
- round start
- private guess submit and update
- lock
- reveal
- scoring
- scoreboard
- QR join
- polling-based host and player views
- Neon-backed shared persistence through `DATABASE_URL`

## Main implementation pieces

- Backend game engine: `src/lib/cwogo/actions.ts`
- Role-aware serializers: `src/lib/cwogo/serializers.ts`
- Postgres-backed persistence layer: `src/lib/cwogo/store.ts`
- Guess parsing: `src/lib/cwogo/parse-guess.ts`
- Scoring logic: `src/lib/cwogo/scoring.ts`
- Host UI: `src/components/cwogo/host-room-screen.tsx`
- Player UI: `src/components/cwogo/player-room-screen.tsx`
- App routes: `src/app/cwogo`
- API routes: `src/app/api/cwogo`

## What is implemented

- Host can create a room and land on a dedicated host screen.
- Players can join via join code and receive a room-scoped cookie session.
- Host actions are server-side route handlers.
- Player guess submission is private before reveal.
- Host pre-reveal state includes submission progress but not raw guesses.
- Player pre-reveal state includes only that player's own guess.
- Round lifecycle supports `open -> locked -> revealed`.
- Expired open rounds lazy-finalize on subsequent reads and writes.
- Guess parsing supports values like `1200000`, `1,200,000`, `1.2m`, `450k`, and `3b`.
- Reveal shows results, busted guesses, winners, and cumulative scoreboard state.

## Verification completed

The following checks pass:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

Manual HTTP smoke test was also completed locally with `curl` across:

- create room
- join room
- start round
- submit guess
- lock round
- reveal round
- read state before and after reveal

## Deliberate deviation from spec

The spec recommends Neon/Postgres + Drizzle with a normalized relational schema.

Current implementation now uses Neon/Postgres, but not the full relational model yet.

The storage shape is currently a single transactional store row in Postgres rather than full tables for rooms, rounds, players, and guesses.

Reason:

- keeps local and Vercel pointed at the same database
- removes the local filesystem blocker for Vercel deployment
- keeps the state model isolated so a fuller relational migration can happen later

## Important operational caveats

- Persistence is now shared through Neon and works for local plus Vercel.
- Local development and production currently point at the same database by default.
- The current store uses row-level transactional locking around a JSON store document.
- This is deployable, but still less expressive than the normalized schema from the spec.
- There is no rate limiting yet.
- There is no automated test suite yet beyond typecheck/lint/build.
- There is no analytics/observability pipeline yet.
- The current app should behave correctly on Vercel, but schema evolution and analytics are still early-stage.

## Local playtesting notes

To test the game manually:

1. Run `pnpm dev`
2. Open `http://localhost:3000/cwogo`
3. Use one browser window for the host
4. Use incognito windows, another browser, or another device for players

Important:

- sessions are cookie-based
- host and player should be tested in separate browser contexts
- if the same browser context holds both sessions, host behavior can mask player behavior
- local playtesting writes to the shared Neon database unless `DATABASE_URL` is changed

## Gaps relative to the original spec

These areas are still open:

- full Drizzle integration
- normalized DB schema and migrations
- rate limiting
- heartbeat / presence handling
- automated unit, integration, and e2e tests
- analytics and structured event logging
- production hardening around concurrency and persistence

## Recommended next step

The cleanest next step is to migrate from the current Postgres JSON store to the normalized Drizzle schema from the original spec while preserving the current route contract and UI behavior.

Suggested order:

1. Introduce Drizzle schema and migrations.
2. Move rooms, players, rounds, and guesses into first-class tables.
3. Preserve the current role-aware serializers and API payloads.
4. Add tests around round transitions, scoring, and redaction before further feature work.
