import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  CwogoGuessStore,
  CwogoPlayerStore,
  CwogoRoomStore,
  CwogoRoundStore,
  CwogoStore,
} from "@/types/cwogo";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "cwogo-store.json");

const EMPTY_STORE: CwogoStore = {
  version: 0,
  rooms: {},
  players: {},
  rounds: {},
  guesses: {},
};

let mutationQueue = Promise.resolve();

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_PATH, "utf8");

  if (!raw.trim()) {
    return structuredClone(EMPTY_STORE);
  }

  return JSON.parse(raw) as CwogoStore;
}

async function writeStore(store: CwogoStore) {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getStoreSnapshot() {
  return readStore();
}

export async function withStoreMutation<T>(
  mutator: (store: CwogoStore, ctx: { markDirty: () => void }) => Promise<T> | T,
) {
  const previous = mutationQueue;
  let release!: () => void;

  mutationQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    const store = await readStore();
    let dirty = false;
    const result = await mutator(store, {
      markDirty: () => {
        dirty = true;
      },
    });

    if (dirty) {
      store.version += 1;
      await writeStore(store);
    }

    return result;
  } finally {
    release();
  }
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
