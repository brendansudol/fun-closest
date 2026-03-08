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

## Main implementation pieces

- Backend game engine: `src/lib/cwogo/actions.ts`
- Role-aware serializers: `src/lib/cwogo/serializers.ts`
- File-backed persistence layer: `src/lib/cwogo/store.ts`
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

The spec recommends Neon/Postgres + Drizzle as the primary persistence layer.

Current implementation uses local file storage at:

- `.data/cwogo-store.json`

Reason:

- keeps the app runnable in this repo with no external setup
- keeps the state model isolated so the storage layer can be swapped later

## Important operational caveats

- Persistence is local-only right now. This is good for development, not deployment.
- The current mutation queue is in-process, which is acceptable for local single-process use but not a substitute for database transactions.
- There is no rate limiting yet.
- There is no automated test suite yet beyond typecheck/lint/build.
- There is no analytics/observability pipeline yet.
- The current app is optimized for trying the game locally, not for multi-instance production hosting.

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

To reset local state:

```bash
rm -f .data/cwogo-store.json
```

## Gaps relative to the original spec

These areas are still open:

- Postgres / Neon / Drizzle integration
- formal DB schema and migrations
- rate limiting
- heartbeat / presence handling
- automated unit, integration, and e2e tests
- analytics and structured event logging
- production hardening around concurrency and persistence

## Recommended next step

The cleanest next step is to replace the file-backed store with Postgres while preserving the existing route contract and UI behavior.

Suggested order:

1. Introduce Drizzle schema and a database client.
2. Port the store reads and writes behind the current server action boundary.
3. Preserve the current role-aware serializers and route payloads.
4. Add tests around round transitions, scoring, and redaction before shipping.
