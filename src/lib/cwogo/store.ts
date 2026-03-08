import postgres from "postgres";
import type {
  CwogoGuessStore,
  CwogoPlayerStore,
  CwogoRoomStore,
  CwogoRoundStore,
  CwogoStore,
} from "@/types/cwogo";

const EMPTY_STORE: CwogoStore = {
  version: 0,
  rooms: {},
  players: {},
  rounds: {},
  guesses: {},
};

declare global {
  var __cwogoSql: ReturnType<typeof postgres> | undefined;
  var __cwogoStoreInitPromise: Promise<void> | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured. Pull Vercel env vars or set it locally.");
  }

  return databaseUrl;
}

function getSqlClient() {
  if (!globalThis.__cwogoSql) {
    globalThis.__cwogoSql = postgres(getDatabaseUrl(), {
      connect_timeout: 15,
      idle_timeout: 20,
      max: 1,
      onnotice: () => {},
      prepare: false,
    });
  }

  return globalThis.__cwogoSql;
}

function normalizeStore(value: Partial<CwogoStore> | string | undefined, version: number) {
  const parsedValue =
    typeof value === "string" ? (JSON.parse(value) as Partial<CwogoStore>) : value;

  return {
    version,
    rooms: parsedValue?.rooms ?? {},
    players: parsedValue?.players ?? {},
    rounds: parsedValue?.rounds ?? {},
    guesses: parsedValue?.guesses ?? {},
  } satisfies CwogoStore;
}

async function ensureStoreRow() {
  const sql = getSqlClient();

  if (!globalThis.__cwogoStoreInitPromise) {
    globalThis.__cwogoStoreInitPromise = (async () => {
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS cwogo_state (
          id smallint PRIMARY KEY,
          version bigint NOT NULL DEFAULT 0,
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await sql`
        INSERT INTO cwogo_state (id, version, data)
        VALUES (1, 0, ${sql.json(EMPTY_STORE)})
        ON CONFLICT (id) DO NOTHING
      `;
    })().catch((error) => {
      globalThis.__cwogoStoreInitPromise = undefined;
      throw error;
    });
  }

  await globalThis.__cwogoStoreInitPromise;
}

export async function getStoreSnapshot() {
  const sql = getSqlClient();
  await ensureStoreRow();

  const rows = await sql<{ version: number; data: Partial<CwogoStore> | string }[]>`
    SELECT version, data
    FROM cwogo_state
    WHERE id = 1
  `;

  const row = rows[0];
  return normalizeStore(row?.data, Number(row?.version ?? 0));
}

export async function withStoreMutation<T>(
  mutator: (store: CwogoStore, ctx: { markDirty: () => void }) => Promise<T> | T,
) {
  const sql = getSqlClient();
  await ensureStoreRow();

  return sql.begin(async (tx) => {
    const rows = await tx.unsafe<{ version: number; data: Partial<CwogoStore> | string }[]>(
      `
        SELECT version, data
        FROM cwogo_state
        WHERE id = $1
        FOR UPDATE
      `,
      [1],
    );

    const row = rows[0];
    const store = normalizeStore(row?.data, Number(row?.version ?? 0));
    let dirty = false;

    const result = await mutator(store, {
      markDirty: () => {
        dirty = true;
      },
    });

    if (dirty) {
      const nextVersion = store.version + 1;
      const nextStore = {
        ...store,
        version: nextVersion,
      } satisfies CwogoStore;

      await tx.unsafe(
        `
          UPDATE cwogo_state
          SET version = $1,
              data = $2::jsonb,
              updated_at = now()
          WHERE id = $3
        `,
        [nextVersion, JSON.stringify(nextStore), 1],
      );
    }

    return result;
  });
}

export function listRoomPlayers(store: CwogoStore, roomId: string) {
  return Object.values(store.players)
    .filter((player) => player.roomId === roomId && player.isActive)
    .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt));
}

export function listRoomRounds(store: CwogoStore, roomId: string) {
  return Object.values(store.rounds)
    .filter((round) => round.roomId === roomId)
    .sort((left, right) => left.roundNumber - right.roundNumber);
}

export function listRoundGuesses(store: CwogoStore, roundId: string) {
  return Object.values(store.guesses)
    .filter((guess) => guess.roundId === roundId)
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
}

export function findRoomBySlug(store: CwogoStore, slug: string) {
  return Object.values(store.rooms).find((room) => room.slug === slug) ?? null;
}

export function findRoomByJoinCode(store: CwogoStore, joinCode: string) {
  return Object.values(store.rooms).find((room) => room.joinCode === joinCode) ?? null;
}

export function getCurrentRound(store: CwogoStore, room: CwogoRoomStore) {
  if (!room.currentRoundId) {
    return null;
  }

  return store.rounds[room.currentRoundId] ?? null;
}

export function findPlayerByTokenHash(store: CwogoStore, roomId: string, sessionTokenHash: string) {
  return (
    Object.values(store.players).find(
      (player) => player.roomId === roomId && player.sessionTokenHash === sessionTokenHash && player.isActive,
    ) ?? null
  );
}

export function findGuessByRoundAndPlayer(store: CwogoStore, roundId: string, playerId: string) {
  return (
    Object.values(store.guesses).find((guess) => guess.roundId === roundId && guess.playerId === playerId) ?? null
  );
}

export function assignRoom(store: CwogoStore, room: CwogoRoomStore) {
  store.rooms[room.id] = room;
}

export function assignPlayer(store: CwogoStore, player: CwogoPlayerStore) {
  store.players[player.id] = player;
}

export function assignRound(store: CwogoStore, round: CwogoRoundStore) {
  store.rounds[round.id] = round;
}

export function assignGuess(store: CwogoStore, guess: CwogoGuessStore) {
  store.guesses[guess.id] = guess;
}
