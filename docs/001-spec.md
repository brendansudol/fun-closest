# Inkling
## Product + Implementation Spec

Version: v1
Target stack: Next.js (App Router) + Vercel + Postgres
Recommended database: Neon via Vercel Marketplace
Recommended sync model for v1: server-authoritative state + short polling

---

## 1) Executive recommendation

Build v1 as a **server-authoritative multiplayer web app** with:

- **Next.js App Router** for UI and API routes
- **Route Handlers** for all game mutations and room state reads
- **Postgres** as the source of truth for rooms, rounds, players, and guesses
- **Opaque cookie sessions** for host and players
- **Short polling** (1s while active, slower while idle) instead of a realtime sync platform

### Why this is the best v1 choice

This game has one unusual requirement: **guesses must stay secret until reveal**.

That means the backend must be authoritative and must return **different state to host vs player vs revealed views**.

For that reason:

- Do **not** use Liveblocks as the primary state layer for v1. Liveblocks is excellent when room state is intentionally shared among connected users, but that is the opposite of this game’s hidden-input requirement.
- Do **not** build your own WebSocket server on Vercel.
- Do **not** add a realtime vendor until you actually need lower latency than polling can provide.

### Recommendation summary

#### v1 (recommended)
- Next.js + Neon/Postgres + Drizzle + polling
- No Liveblocks
- No Ably/Pusher/Supabase Realtime yet

#### v1.5 (optional)
If polling feels too sluggish, add **Ably** only for:
- room presence
- phase changes
- submitted count updates
- “reveal now” pushes

Even then, keep **guesses and scoring in Postgres**.

---

## 2) Product goals

### Goals

1. A host can create a unique room and reuse it across many meetings.
2. Teammates can join the room from their phones/laptops via a short code or QR code.
3. Each teammate can submit a **secret numeric guess** during the round.
4. The host screen shows:
   - current prompt
   - countdown
   - how many players have submitted
   - optionally who has submitted (but not the values)
5. When the round locks, the host can reveal all guesses on the shared screen.
6. The app determines the winner using **closest without going over**.
7. The room supports many rounds in sequence with a cumulative scoreboard.
8. The UX is fast enough for 1–2 minute end-of-meeting play.

### Non-goals for v1

1. Full account system / SSO / org management
2. Cross-room global profiles
3. Chat / voice / reactions
4. Moderator tools beyond host controls
5. Generic engine for every future game
6. CMS/admin content tooling beyond a lightweight prompt bank

---

## 3) Core game rules

### Round flow

1. Players join room
2. Host starts a round
3. Prompt is shown to all players
4. Players submit guesses privately
5. Host sees submission progress only
6. Time expires or host locks round early
7. System scores the round server-side
8. Host reveals results
9. Winner(s) get points
10. Host starts next round

### Rules

- Each player gets **one active guess per round**.
- Players may **edit** their guess until the round locks.
- A guess **strictly greater than** the actual answer is a **bust**.
- The winning guess is the **highest guess less than or equal to the answer**.
- Exact match is allowed and wins.
- Ties are allowed. If two players submit the same winning value, they are co-winners.
- If everyone goes over, there is **no winner** for that round.

### Suggested timing defaults

- Lobby/join: unlimited
- Submission window: **25 seconds** default
- Locked pause before reveal: **manual reveal** by host
- Revealed state: until host starts next round

Reason: the manual reveal creates a small dramatic pause without adding much complexity.

---

## 4) Room + identity model

There are only two roles in v1:

- **host**
- **player**

### Host auth model

When a room is created:
- generate a public `room_slug`
- generate a short public `join_code`
- generate a secret `admin_token`
- store only a **hash** of the admin token in DB
- set an **HttpOnly host session cookie**
- redirect host to canonical host URL

Important: the host secret should **not** remain visible in the browser URL once the host lands on the room page.

### Player auth model

Players join with:
- room join code or direct join URL
- display name

Server then:
- creates or resumes a player session for that room
- stores a hashed opaque session token in DB
- sets an **HttpOnly player session cookie**

No email or password is needed in v1.

---

## 5) Key UX decisions

### Host view

#### Lobby
- room title
- join code
- QR code
- player roster
- pack selector (e.g. Geography / Tech / Mixed)
- round length selector
- start round button

#### Round open
- large prompt text
- units/subtitle
- countdown timer
- submitted count (`7 / 12 submitted`)
- optional player roster with checkmarks
- “Lock now” button

#### Round locked
- “All guesses locked” state
- “Reveal” button
- optional small animation / pause

#### Revealed
- number line / dot plot of all guesses
- actual value marker
- busted guesses visually separated
- winner banner
- scoreboard
- “Next round” button

### Player view

#### Join screen
- name input
- join room CTA

#### Lobby
- waiting state
- pack or theme label
- player’s display name

#### Round open
- prompt
- units
- optional hint/anchor
- large numeric input
- submit/update button
- confirmation state after submit

#### Locked
- “Locked. Waiting for reveal.”

#### Revealed
- results chart
- player’s own guess highlighted
- winner and actual value
- scoreboard

### Mobile-first behavior

Player experience must be optimized for phone screens:
- large numeric keypad-friendly input
- big submit button
- minimal text
- no hover interactions

### Accessibility

- keyboard operable on desktop
- high-contrast visuals
- do not rely on color alone for bust/winner states
- text labels for icons and status

---

## 6) Recommended architecture

### v1 architecture

```text
Browser (host/player)
  -> Next.js app on Vercel
    -> Route Handlers
      -> Postgres (Neon)
```

### Source of truth

**Postgres is the single source of truth** for:
- rooms
- players
- current round
- guesses
- scoring results
- scoreboard totals

### Synchronization model

Use **short polling** instead of live shared state.

#### Poll intervals
- host during active round: every 1000 ms
- players during active round: every 1000–1500 ms
- idle/revealed/lobby: every 3000 ms

This is more than sufficient for meeting-scale rooms.

### Why this is better than Liveblocks for this game

The hard requirement is hidden guesses. In this game, room state is **not fully shared**:
- host should see only counts/status pre-reveal
- players should see only their own guess pre-reveal
- nobody should see others’ values until reveal

That means the system needs **role-aware and phase-aware responses** from the server.

This is a better fit for:
- server-owned database state
- access-controlled API responses
- polling or push notifications of state changes

### Why not SSE for v1

Possible, but not recommended for v1. It adds:
- reconnect logic
- long-lived connection complexity
- stream duration handling
- more code paths to debug

Polling is simpler and more reliable for this use case.

### Optional phase 2 realtime upgrade

If you later want truly instant host counters and phase changes:
- add **Ably** room channels
- publish only **non-secret events** to clients
- keep all guesses/scoring in Postgres

Good Ably event examples:
- `player_joined`
- `submission_count_changed`
- `round_locked`
- `round_revealed`

Never publish raw guesses before reveal.

---

## 7) Suggested tech stack

### Required
- Next.js (latest stable App Router)
- TypeScript
- React
- Tailwind CSS (optional but recommended)
- Drizzle ORM
- Zod
- Neon Postgres
- TanStack Query

### Useful utilities
- `jose` or equivalent only if using signed JWT sessions
- OR simpler: opaque tokens with SHA-256 hashes stored in DB
- `qrcode` / `qrcode.react` for join QR
- lightweight SVG/CSS chart for reveal line

### Recommendation on sessions

Use **opaque session tokens**, not JWTs, for v1.

Why:
- easier revocation
- simple server validation
- fewer auth edge cases
- no need to encode room claims client-side

---

## 8) Route structure

```text
app/
  inkling/
    page.tsx                         # landing / create room
    join/[code]/page.tsx             # public join page
    rooms/[slug]/host/page.tsx       # host screen
    rooms/[slug]/play/page.tsx       # player screen

  api/
    inkling/
      rooms/route.ts                 # POST create room
      join/route.ts                  # POST join room
      rooms/[slug]/state/route.ts    # GET room state (role-aware)
      rooms/[slug]/heartbeat/route.ts# POST optional heartbeat
      rooms/[slug]/host/start/route.ts
      rooms/[slug]/host/lock/route.ts
      rooms/[slug]/host/reveal/route.ts
      rounds/[roundId]/guess/route.ts
```

### Why Route Handlers

This app has multiple surfaces calling the backend:
- host screen
- player screen
- polling endpoints
- room/session mutations

That makes Route Handlers cleaner than trying to model everything as forms.

---

## 9) Database schema

Use Postgres enums or text enums enforced in app logic.

### `game_rooms`

- `id uuid pk`
- `slug text unique not null`
- `join_code text unique not null`
- `title text null`
- `admin_token_hash text not null`
- `current_round_id uuid null`
- `default_pack text not null default 'mixed'`
- `default_round_seconds int not null default 25`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `game_players`

- `id uuid pk`
- `room_id uuid not null references game_rooms(id)`
- `display_name text not null`
- `session_token_hash text not null unique`
- `score_total int not null default 0`
- `joined_at timestamptz not null default now()`
- `last_seen_at timestamptz not null default now()`
- `is_active boolean not null default true`

Index:
- `(room_id)`
- `(room_id, is_active)`

### `game_rounds`

- `id uuid pk`
- `room_id uuid not null references game_rooms(id)`
- `round_number int not null`
- `phase text not null`  // `draft | open | locked | revealed`
- `prompt_id uuid null`
- `prompt_text text not null`
- `prompt_unit_label text not null`
- `prompt_unit_short text null`
- `answer_numeric numeric(20,4) not null`
- `answer_display text not null`
- `hint_text text null`
- `pack text not null`
- `category text null`
- `difficulty smallint null`
- `opens_at timestamptz not null`
- `locks_at timestamptz not null`
- `locked_at timestamptz null`
- `revealed_at timestamptz null`
- `created_at timestamptz not null default now()`

Unique:
- `(room_id, round_number)`

Index:
- `(room_id, phase)`

### `game_guesses`

- `id uuid pk`
- `round_id uuid not null references game_rounds(id)`
- `player_id uuid not null references game_players(id)`
- `guess_numeric numeric(20,4) not null`
- `guess_raw text not null`
- `submitted_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `is_bust boolean null`
- `distance_under numeric(20,4) null`
- `rank int null`
- `is_winner boolean not null default false`

Unique:
- `(round_id, player_id)`

Index:
- `(round_id)`
- `(round_id, is_winner)`

### `game_prompts` (optional DB-backed prompt bank)

- `id uuid pk`
- `pack text not null`
- `category text not null`
- `prompt_text text not null`
- `unit_label text not null`
- `unit_short text null`
- `answer_numeric numeric(20,4) not null`
- `answer_display text not null`
- `hint_text text null`
- `answer_year int null`
- `source_label text null`
- `difficulty smallint null`
- `is_active boolean not null default true`

For MVP, this can also live in a typed seed file and be inserted at startup/migration time.

---

## 10) State machine

### Room
- lobby: no active round
- active: current round exists and is not fully closed

### Round phases

#### `draft`
Host has selected/generated the question but players cannot answer yet.

#### `open`
Players can submit or edit guesses.

#### `locked`
No more submissions. Results are scored but not yet visible.

#### `revealed`
All guesses and scoring are visible.

### Important rule: server time wins

All lock logic must be based on **server time**, not client time.

Clients should receive:
- `server_now`
- `locks_at`

UI countdowns are cosmetic. The backend decides whether a round is open.

### Important rule: expired rounds auto-finalize

If a round is still marked `open` in DB but `now() >= locks_at`, any subsequent:
- state read
- guess submit
- host action

should trigger a **lazy finalize** step that locks and scores the round exactly once.

This prevents bugs when the host tab is backgrounded or asleep.

---

## 11) API contract

## `POST /api/inkling/rooms`
Create room.

Request:
```json
{
  "title": "Friday retro",
  "defaultPack": "mixed",
  "defaultRoundSeconds": 25
}
```

Behavior:
- create room row
- create host session cookie
- return room slug + join code

Response:
```json
{
  "roomSlug": "c7m4kq8r",
  "joinCode": "7K3M9Q",
  "hostUrl": "/inkling/rooms/c7m4kq8r/host"
}
```

## `POST /api/inkling/join`
Join room as player.

Request:
```json
{
  "joinCode": "7K3M9Q",
  "displayName": "Ava"
}
```

Behavior:
- validate room exists
- create player if needed
- set player session cookie

Response:
```json
{
  "roomSlug": "c7m4kq8r",
  "playerUrl": "/inkling/rooms/c7m4kq8r/play"
}
```

## `GET /api/inkling/rooms/[slug]/state`
Returns role-aware room state.

Query params:
- none for MVP
- optional `sinceVersion` later if optimized

Behavior:
- authenticate by session cookie
- maybe auto-lock expired round
- return only data safe for that role and phase

### Host response before reveal
- room metadata
- players
- submission count
- who submitted (optional)
- prompt
- countdown
- **not raw guesses**

### Player response before reveal
- room metadata
- current prompt
- countdown
- player’s own guess only
- maybe submitted count
- **never other players’ guesses**

### Any response after reveal
- full results + winners + scoreboard

## `POST /api/inkling/rooms/[slug]/host/start`
Starts a new round.

Request:
```json
{
  "pack": "geography",
  "roundSeconds": 25,
  "promptId": "optional-specific-prompt-id"
}
```

Behavior:
- host auth required
- create round row
- choose prompt
- set current round
- phase becomes `open`

## `POST /api/inkling/rounds/[roundId]/guess`
Submit or update guess.

Request:
```json
{
  "guess": "1.2m"
}
```

Behavior:
- player auth required
- validate round open according to server time
- parse and normalize guess
- upsert guess row

Response:
```json
{
  "ok": true,
  "normalizedGuess": 1200000,
  "displayGuess": "1,200,000"
}
```

## `POST /api/inkling/rooms/[slug]/host/lock`
Locks round early or finalizes an expired round.

Behavior:
- host auth required
- idempotent
- transactionally marks round locked
- scores all guesses

## `POST /api/inkling/rooms/[slug]/host/reveal`
Marks round revealed.

Behavior:
- host auth required
- idempotent
- revealed_at set
- state endpoint now includes all guess values

---

## 12) Role-aware state shapes

The easiest way to prevent leakage is to define distinct server serializers.

### `serializeHostState(room, round, players, guesses?)`
Pre-reveal:
- include only counts / submitted flags
- no guess values

### `serializePlayerState(room, round, me, myGuess, guesses?)`
Pre-reveal:
- include only own guess
- never other guess rows

### `serializeRevealedState(room, round, players, guesses)`
After reveal:
- include all guesses
- winners
- scoreboard

Do **not** have a single broad state object and try to hide fields client-side.
All hiding must happen on the server.

---

## 13) Guess parsing + scoring

### Input parsing requirements

Accept these forms:
- `1200000`
- `1,200,000`
- `1.2m`
- `1.2 million`
- `450k`
- `3b`

Reject:
- negative values
- zero if prompt logically requires positive values
- non-numeric text

Server should normalize to `numeric`.

### Scoring algorithm

Pseudo:

```ts
for each guess:
  if guess > answer:
    isBust = true
    distanceUnder = null
  else:
    isBust = false
    distanceUnder = answer - guess

eligible = guesses where isBust = false

if eligible.length === 0:
  no winners
else:
  minDistance = min(distanceUnder)
  winners = eligible where distanceUnder === minDistance
```

### Rank suggestions

- winners: rank 1
- remaining non-bust guesses sorted ascending by distance_under
- busts sorted separately

### Scoreboard suggestion

- win = +1 point
- exact match = +2 total (optional)
- bust = 0
- no winner round = no points awarded

Use simple scoring for v1.

---

## 14) Reveal chart spec

Use a custom SVG or lightweight HTML/CSS visualization.
No heavy chart library needed.

### Chart requirements

- horizontal number line
- vertical marker for actual value
- one dot per player guess
- winner dots visually emphasized
- bust guesses styled differently (e.g. red outline or busted label)
- exact numeric labels shown on hover for desktop and inline list on mobile

### Scale

For v1:
- `min = max(0, floor(min(actual, lowest_guess) * 0.9))`
- `max = ceil(max(actual, highest_guess) * 1.1)`

This is simple and understandable.

### Supporting list below chart

Because shared screens can be hard to read, show a result list below:

- Player name
- Guess
- Status (`winner`, `under`, `bust`, `exact`)

---

## 15) Security model

### Principles

1. Hidden guesses are server-only until reveal.
2. All writes require a valid room session.
3. All host actions require a host session.
4. All sensitive tokens are stored as hashes in DB.
5. Cookies must be `HttpOnly`, `Secure`, and `SameSite=Lax`.

### Specific protections

- never trust client phase
- never trust client countdown
- never accept host role from client body/query
- never expose admin token after initial room create flow
- do not return all guesses to host before reveal unless you explicitly want that mode

### Rate limiting

For v1, implement lightweight per-IP + per-session rate limits on:
- room creation
- join
- guess submit
- host actions

This can be done later if needed, but design routes so it is easy to add.

---

## 16) Concurrency and edge cases

### Must-handle edge cases

1. Two host actions fired at once
   - lock and reveal must be idempotent

2. Guess arrives exactly at deadline
   - server decides based on transaction time and `locks_at`

3. Player double-submits rapidly
   - upsert by `(round_id, player_id)`

4. Host tab sleeps past countdown
   - lazy finalize on next read/action

5. Player joins mid-round
   - allow joining and guessing if round is still open

6. All players bust
   - no winner state must render cleanly

7. No players submit
   - round can still be revealed with “No submissions” result

8. Duplicate player names
   - acceptable in v1, but UI should handle it gracefully

### DB transaction guidance

For mutating host actions, use a DB transaction and lock the room/current round row.

Examples:
- `SELECT ... FOR UPDATE` on current round before changing phase
- commit scoring + state transition atomically

---

## 17) Polling strategy

Use TanStack Query with role-specific hooks.

### Hooks
- `useHostRoomState(roomSlug)`
- `usePlayerRoomState(roomSlug)`
- `useSubmitGuess(roundId)`
- `useStartRound(roomSlug)`
- `useLockRound(roomSlug)`
- `useRevealRound(roomSlug)`

### Recommended intervals

#### Host
- lobby/revealed: 3000 ms
- open/locked: 1000 ms

#### Player
- lobby/revealed: 3000 ms
- open and not yet submitted: 1000 ms
- open and already submitted: 1500 ms

### Nice optimization

Include `room_version` in every state payload.
Later you can add conditional fetching/ETags if needed.

---

## 18) Prompt bank design

For v1, prompt content should be curated and static.

### Prompt shape

```ts
type Prompt = {
  id: string;
  pack: 'mixed' | 'geography' | 'tech' | 'us';
  category: string;
  promptText: string;
  unitLabel: string;
  unitShort?: string;
  answerNumeric: string;
  answerDisplay: string;
  hintText?: string;
  difficulty?: 1 | 2 | 3;
  answerYear?: number;
  sourceLabel?: string;
};
```

### Prompt curation rules

- avoid prompts where the answer is unknowable without niche expertise
- prefer values people can at least estimate
- include unit/year/context in the prompt
- avoid prompts with rapidly changing answers unless tied to a specific reference date

Examples:
- Population of Mongolia (2024 estimate)
- Land area of Nevada in square miles
- Number of countries in Africa
- Length of the Danube in kilometers

---

## 19) Suggested file organization

```text
src/
  app/
    inkling/
      page.tsx
      join/[code]/page.tsx
      rooms/[slug]/host/page.tsx
      rooms/[slug]/play/page.tsx
    api/inkling/...

  components/game/
    host-lobby.tsx
    host-round-open.tsx
    host-round-locked.tsx
    host-round-revealed.tsx
    player-join-form.tsx
    player-round-open.tsx
    player-round-locked.tsx
    player-round-revealed.tsx
    result-number-line.tsx
    scoreboard.tsx
    qr-join-card.tsx

  lib/game/
    auth.ts
    cookies.ts
    prompts.ts
    state.ts
    serializers.ts
    scoring.ts
    parse-guess.ts
    timers.ts
    room-actions.ts
    validations.ts

  lib/db/
    schema.ts
    client.ts
    queries.ts
    mutations.ts

  hooks/
    use-host-room-state.ts
    use-player-room-state.ts
    use-submit-guess.ts

  types/
    game.ts
```

---

## 20) Milestone plan

## Milestone 0 — project bootstrap

Deliverables:
- Next.js app with App Router
- Tailwind (optional)
- Neon DB connected
- Drizzle set up
- `AGENTS.md` at repo root

## Milestone 1 — room creation + join

Deliverables:
- create room flow
- join by code flow
- host cookie + player cookie
- host lobby page
- player join/lobby page
- QR code display

Acceptance:
- host can create room
- at least 3 players can join from different devices

## Milestone 2 — round lifecycle

Deliverables:
- prompt selection
- start round endpoint
- countdown rendering
- submit guess endpoint
- lock endpoint
- reveal endpoint

Acceptance:
- players can submit/update secret guesses
- host sees only submission count/status pre-reveal

## Milestone 3 — scoring + reveal UI

Deliverables:
- server scoring
- revealed state serializer
- number line chart
- winners banner
- bust visualization
- scoreboard accumulation

Acceptance:
- reveal correctly identifies winners and busts
- ties behave correctly
- no-winner rounds behave correctly

## Milestone 4 — hardening

Deliverables:
- lazy finalize on expired rounds
- idempotent host actions
- better validation/error states
- basic analytics/logging
- e2e test coverage

## Milestone 5 — polish

Deliverables:
- mobile UI improvements
- subtle animations
- pack selector
- round history
- exact-match flourish

## Optional Milestone 6 — realtime enhancement

Deliverables:
- Ably integration for non-secret events only
- replace most active polling with channel events
- keep DB as source of truth

---

## 21) Testing plan

### Unit tests
- guess parser
- scoring function
- serializer redaction rules
- phase transition logic
- prompt selection rules

### Integration tests
- create room
- join room
- submit guess
- lock round
- reveal round
- lazy finalize on expired round

### E2E tests (Playwright)

Scenarios:
1. host + 3 players normal round
2. players edit guesses before lock
3. exact match winner
4. all bust
5. no submissions
6. duplicate lock/reveal requests
7. join mid-round

### Manual QA checklist
- mobile Safari/Chrome input behavior
- desktop host with large monitor + shared screen readability
- slow network / tab refresh recovery
- cookies across reloads

---

## 22) Observability

Log these server events:
- room_created
- player_joined
- round_started
- guess_submitted
- round_locked
- round_revealed
- winner_declared

Useful derived metrics:
- average players per room
- average submit rate
- average round duration
- bust rate
- exact match rate
- prompts with highest/lowest success rate

---

## 23) Acceptance criteria for v1

1. Host can create a room in under 10 seconds.
2. Players can join from phones using code or QR.
3. A round can be started, answered, locked, and revealed without page refresh.
4. Guesses remain hidden before reveal.
5. Winner logic is correct for:
   - exact match
   - multiple ties
   - all bust
   - no submissions
6. Host screen is readable on a shared screen.
7. Player input flow feels good on mobile.
8. The system survives refreshes and duplicate clicks.

---

## 24) Explicit recommendation on Liveblocks / Supabase / Ably

### Liveblocks
Not recommended as the primary backend for this game.

Reason:
- its core value is shared collaborative room state
- this game needs hidden per-user data before reveal
- you would end up fighting the abstraction or building private subrooms

Could be used later for visible presence only, but that is unnecessary for v1.

### Supabase
Viable alternative if you want:
- Postgres
- anonymous auth
- RLS
- built-in realtime

But for this specific v1, it is more platform than you need.

### Ably
Best optional realtime add-on later.

Use it when you want:
- instant submitted counts
- instant phase changes
- smoother larger rooms

Still keep guesses and scoring server-side in Postgres.

---

## 25) Notes for Codex / Claude Code

1. Treat the database as the only source of truth.
2. Never expose all guesses before reveal.
3. Prefer Route Handlers over ad hoc client-side data writes.
4. Use explicit role-aware serializers.
5. Make host actions idempotent.
6. Implement lazy auto-lock based on server time.
7. Keep the first version boring and robust.
8. Do not add websocket infrastructure in v1.

### Agent setup note

Add `AGENTS.md` at repo root with instructions to read the installed Next.js docs in `node_modules/next/dist/docs/` before making framework-specific changes.

---

## 26) Final build recommendation

If I were handing this to an implementation agent today, I would ask it to build exactly this:

- **Next.js App Router**
- **Neon Postgres** via Vercel Marketplace
- **Drizzle ORM**
- **Opaque cookie sessions**
- **TanStack Query polling**
- **Role-aware state endpoint**
- **Server-side scoring**
- **Manual reveal after lock**
- **SVG number line reveal chart**

And I would explicitly tell it:

> Do not use Liveblocks for guesses. Do not implement WebSockets on Vercel. Build the hidden-guess multiplayer flow with Postgres + polling first. Make it solid, then consider Ably later.
