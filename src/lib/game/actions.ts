import { DEFAULT_ROOM_TITLE, DEFAULT_ROUND_SECONDS } from "./constants";
import { GameError, invariant } from "./errors";
import { formatPromptNumericValue } from "./format";
import { isGameOver } from "./game";
import { parseGuessInput } from "./parse-guess";
import {
  buildPromptPool,
  getPromptRevision,
  getRoundPromptHistoryIds,
  listUsedPromptIdsForRounds,
  selectRandomPrompt,
} from "./prompt-selection";
import { scoreGuessRows } from "./scoring";
import {
  assignGuess,
  assignPlayer,
  assignRoom,
  assignRound,
  findGuessByRoundAndPlayer,
  findPlayerByTokenHash,
  findRoomByJoinCode,
  findRoomBySlug,
  getCurrentRound,
  getStoreSnapshot,
  listRoomPlayers,
  listRoomRounds,
  listRoundGuesses,
  withStoreMutation,
} from "./store";
import { hashOpaqueToken, createOpaqueToken } from "./session";
import { serializeHostState, serializePlayerState } from "./serializers";
import type { RoomStore, Pack, RoomStateResponse } from "@/types/game";

function nowIso() {
  return new Date().toISOString();
}

function futureIso(secondsFromNow: number) {
  return new Date(Date.now() + secondsFromNow * 1_000).toISOString();
}

function futureIsoFrom(baseTime: string, secondsFromBase: number) {
  return new Date(new Date(baseTime).getTime() + secondsFromBase * 1_000).toISOString();
}

function randomChars(alphabet: string, size: number) {
  let value = "";

  while (value.length < size) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return value;
}

function createRoomSlug(store: Awaited<ReturnType<typeof getStoreSnapshot>>) {
  let slug = randomChars("abcdefghjkmnpqrstuvwxyz23456789", 8);

  while (findRoomBySlug(store, slug)) {
    slug = randomChars("abcdefghjkmnpqrstuvwxyz23456789", 8);
  }

  return slug;
}

function createJoinCode(store: Awaited<ReturnType<typeof getStoreSnapshot>>) {
  let joinCode = randomChars("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

  while (findRoomByJoinCode(store, joinCode)) {
    joinCode = randomChars("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
  }

  return joinCode;
}

function listUsedPromptIdsForRoom(store: Awaited<ReturnType<typeof getStoreSnapshot>>, roomId: string) {
  return listUsedPromptIdsForRounds(listRoomRounds(store, roomId));
}

function getMostRecentPromptIdForRoom(store: Awaited<ReturnType<typeof getStoreSnapshot>>, roomId: string) {
  return listRoomRounds(store, roomId).at(-1)?.promptId ?? null;
}

function selectPrompt(
  store: Awaited<ReturnType<typeof getStoreSnapshot>>,
  room: RoomStore,
  pack: Pack,
  promptId?: string,
) {
  const pool = buildPromptPool(pack);

  invariant(pool.length > 0, "No prompts are available for that pack.", 400);

  const usedPromptIds = listUsedPromptIdsForRoom(store, room.id);
  const lastPromptId = getMostRecentPromptIdForRoom(store, room.id);
  const selectedPrompt = selectRandomPrompt({
    pool,
    requestedPromptId: promptId,
    usedPromptIds,
    fallbackExcludePromptId: lastPromptId,
    allowFallbackToExcluded: true,
  });

  if (promptId) {
    invariant(selectedPrompt, "Prompt not found for that pack.", 404);
    return selectedPrompt;
  }

  invariant(selectedPrompt, "No prompts are available for that pack.", 409);
  return selectedPrompt;
}

function authenticateHost(store: Awaited<ReturnType<typeof getStoreSnapshot>>, slug: string, token: string) {
  const room = findRoomBySlug(store, slug);
  invariant(room, "Room not found.", 404);
  invariant(room.adminTokenHash === hashOpaqueToken(token), "Host session required.", 401);
  return room;
}

function authenticatePlayer(store: Awaited<ReturnType<typeof getStoreSnapshot>>, roomId: string, token: string) {
  const player = findPlayerByTokenHash(store, roomId, hashOpaqueToken(token));
  invariant(player, "Player session required.", 401);
  return player;
}

function getRoundLengthSeconds(round: { opensAt: string; locksAt: string }) {
  const roundLengthMs = new Date(round.locksAt).getTime() - new Date(round.opensAt).getTime();
  return Math.max(1, Math.round(roundLengthMs / 1_000));
}

function lockAndScoreRound(
  store: Awaited<ReturnType<typeof getStoreSnapshot>>,
  room: RoomStore,
  currentTime: string,
) {
  const round = getCurrentRound(store, room);

  if (!round) {
    return false;
  }

  let changed = false;

  if (round.phase === "open") {
    round.phase = "locked";
    round.lockedAt = currentTime;
    changed = true;
  }

  if (!round.scoreApplied) {
    const guesses = listRoundGuesses(store, round.id);
    const { scoredGuesses } = scoreGuessRows(round.answerNumeric, guesses);

    for (const result of scoredGuesses) {
      const guess = store.guesses[result.id];
      if (!guess) {
        continue;
      }

      guess.isBust = result.isBust;
      guess.distanceUnder = result.distanceUnder;
      guess.rank = result.rank;
      guess.pointsAwarded = result.pointsAwarded;
      guess.isWinner = result.isWinner;

      if (result.pointsAwarded > 0) {
        const player = store.players[guess.playerId];
        if (player) {
          player.scoreTotal += result.pointsAwarded;
        }
      }
    }

    round.scoreApplied = true;
    changed = true;
  }

  if (changed) {
    room.updatedAt = currentTime;
  }

  return changed;
}

async function finalizeExpiredRound(slug: string) {
  await withStoreMutation((store, { markDirty }) => {
    const room = findRoomBySlug(store, slug);

    if (!room) {
      return;
    }

    const round = getCurrentRound(store, room);
    if (!round || round.phase !== "open") {
      return;
    }

    if (Date.now() < new Date(round.locksAt).getTime()) {
      return;
    }

    const didChange = lockAndScoreRound(store, room, nowIso());
    if (didChange) {
      markDirty();
    }
  });
}

export async function createRoom(input: {
  title: string;
  defaultPack: Pack;
  defaultRoundSeconds: number;
  maxRounds: number | null;
}) {
  return withStoreMutation((store, { markDirty }) => {
    const roomId = crypto.randomUUID();
    const hostToken = createOpaqueToken();
    const createdAt = nowIso();
    const room: RoomStore = {
      id: roomId,
      slug: createRoomSlug(store),
      joinCode: createJoinCode(store),
      title: input.title.trim() || DEFAULT_ROOM_TITLE,
      adminTokenHash: hashOpaqueToken(hostToken),
      currentRoundId: null,
      defaultPack: input.defaultPack,
      defaultRoundSeconds: input.defaultRoundSeconds || DEFAULT_ROUND_SECONDS,
      maxRounds: input.maxRounds,
      createdAt,
      updatedAt: createdAt,
    };

    assignRoom(store, room);
    markDirty();

    return {
      room,
      hostToken,
      hostUrl: `/inkling/rooms/${room.slug}/host`,
    };
  });
}

export async function joinRoom(input: {
  joinCode: string;
  displayName: string;
  existingToken?: string | null;
}) {
  return withStoreMutation((store, { markDirty }) => {
    const room = findRoomByJoinCode(store, input.joinCode);
    invariant(room, "Room not found for that join code.", 404);

    const currentTime = nowIso();

    if (input.existingToken) {
      const existingPlayer = findPlayerByTokenHash(store, room.id, hashOpaqueToken(input.existingToken));

      if (existingPlayer) {
        existingPlayer.displayName = input.displayName;
        existingPlayer.lastSeenAt = currentTime;
        markDirty();

        return {
          room,
          player: existingPlayer,
          playerToken: input.existingToken,
          playerUrl: `/inkling/rooms/${room.slug}/play`,
        };
      }
    }

    const playerToken = createOpaqueToken();
    const player = {
      id: crypto.randomUUID(),
      roomId: room.id,
      displayName: input.displayName,
      sessionTokenHash: hashOpaqueToken(playerToken),
      scoreTotal: 0,
      joinedAt: currentTime,
      lastSeenAt: currentTime,
      isActive: true,
    };

    assignPlayer(store, player);
    room.updatedAt = currentTime;
    markDirty();

    return {
      room,
      player,
      playerToken,
      playerUrl: `/inkling/rooms/${room.slug}/play`,
    };
  });
}

export async function readRoleAwareRoomState(input: {
  slug: string;
  hostToken?: string | null;
  playerToken?: string | null;
}): Promise<RoomStateResponse> {
  await finalizeExpiredRound(input.slug);
  const store = await getStoreSnapshot();
  const room = findRoomBySlug(store, input.slug);

  invariant(room, "Room not found.", 404);

  const round = getCurrentRound(store, room);
  const players = listRoomPlayers(store, room.id);
  const rounds = listRoomRounds(store, room.id);
  const guesses = round ? listRoundGuesses(store, round.id) : [];
  const serverNow = nowIso();

  if (input.hostToken && room.adminTokenHash === hashOpaqueToken(input.hostToken)) {
    return serializeHostState({
      room,
      roomVersion: store.version,
      round,
      rounds,
      players,
      guesses,
      serverNow,
    });
  }

  if (input.playerToken) {
    const player = findPlayerByTokenHash(store, room.id, hashOpaqueToken(input.playerToken));
    if (player) {
      return serializePlayerState({
        room,
        roomVersion: store.version,
        round,
        rounds,
        players,
        guesses,
        me: player,
        serverNow,
      });
    }
  }

  throw new GameError(401, "A valid room session is required.");
}

export async function startRound(input: {
  slug: string;
  hostToken: string;
  pack: Pack;
  roundSeconds: number;
  maxRounds: number | null;
  promptId?: string;
}) {
  return withStoreMutation((store, { markDirty }) => {
    const room = authenticateHost(store, input.slug, input.hostToken);
    const currentRound = getCurrentRound(store, room);
    const rounds = listRoomRounds(store, room.id);

    if (currentRound && currentRound.phase !== "revealed") {
      throw new GameError(409, "Finish revealing the current round before starting another.");
    }

    if (isGameOver({ room, roundsPlayed: rounds.length, currentRound })) {
      throw new GameError(409, "This game has reached its round cap. Start a new game to reset the scoreboard.");
    }

    const selectedPrompt = selectPrompt(store, room, input.pack, input.promptId);
    const currentTime = nowIso();
    const roundId = crypto.randomUUID();

    assignRound(store, {
      id: roundId,
      roomId: room.id,
      roundNumber: rounds.length + 1,
      phase: "open",
      promptId: selectedPrompt.id,
      promptHistoryIds: [selectedPrompt.id],
      promptText: selectedPrompt.promptText,
      promptUnitLabel: selectedPrompt.unitLabel,
      promptUnitShort: selectedPrompt.unitShort ?? null,
      answerNumeric: selectedPrompt.answerNumeric,
      answerDisplay: selectedPrompt.answerDisplay,
      hintText: selectedPrompt.hintText ?? null,
      pack: input.pack,
      category: selectedPrompt.category,
      difficulty: selectedPrompt.difficulty ?? null,
      opensAt: currentTime,
      locksAt: futureIso(input.roundSeconds),
      lockedAt: null,
      revealedAt: null,
      scoreApplied: false,
      createdAt: currentTime,
    });

    room.currentRoundId = roundId;
    room.defaultPack = input.pack;
    room.defaultRoundSeconds = input.roundSeconds;
    if (rounds.length === 0) {
      room.maxRounds = input.maxRounds;
    }
    room.updatedAt = currentTime;
    markDirty();

    return { ok: true, roundId };
  });
}

export async function swapRoundPrompt(input: { slug: string; hostToken: string }) {
  const result = await withStoreMutation((store, { markDirty }) => {
    const room = authenticateHost(store, input.slug, input.hostToken);
    const currentRound = getCurrentRound(store, room);

    invariant(currentRound, "There is no active round to swap.", 404);
    invariant(currentRound.phase === "open", "Only open rounds can swap prompts.", 409);

    const currentTime = nowIso();

    if (Date.now() >= new Date(currentRound.locksAt).getTime()) {
      const didChange = lockAndScoreRound(store, room, currentTime);

      if (didChange) {
        markDirty();
      }

      return { status: "locked" as const };
    }

    const pool = buildPromptPool(currentRound.pack);
    invariant(pool.length > 0, "No prompts are available for that pack.", 400);

    const currentPromptHistoryIds = getRoundPromptHistoryIds(currentRound);
    const selectedPrompt = selectRandomPrompt({
      pool,
      usedPromptIds: listUsedPromptIdsForRoom(store, room.id),
      currentRoundPromptIds: currentPromptHistoryIds,
      fallbackExcludePromptId: currentRound.promptId,
    });

    invariant(selectedPrompt, "No alternate prompt is available for that pack.", 409);
    const roundLengthSeconds = getRoundLengthSeconds(currentRound);

    currentRound.promptId = selectedPrompt.id;
    currentRound.promptHistoryIds = [...currentPromptHistoryIds, selectedPrompt.id];
    currentRound.promptText = selectedPrompt.promptText;
    currentRound.promptUnitLabel = selectedPrompt.unitLabel;
    currentRound.promptUnitShort = selectedPrompt.unitShort ?? null;
    currentRound.answerNumeric = selectedPrompt.answerNumeric;
    currentRound.answerDisplay = selectedPrompt.answerDisplay;
    currentRound.hintText = selectedPrompt.hintText ?? null;
    currentRound.category = selectedPrompt.category;
    currentRound.difficulty = selectedPrompt.difficulty ?? null;
    currentRound.opensAt = currentTime;
    currentRound.locksAt = futureIsoFrom(currentTime, roundLengthSeconds);
    currentRound.lockedAt = null;
    currentRound.revealedAt = null;
    currentRound.scoreApplied = false;

    for (const guess of listRoundGuesses(store, currentRound.id)) {
      delete store.guesses[guess.id];
    }

    room.updatedAt = currentTime;
    markDirty();

    return { status: "ok" as const };
  });

  if (result.status === "locked") {
    throw new GameError(409, "That round just locked.");
  }

  return { ok: true };
}

export async function lockRound(input: { slug: string; hostToken: string }) {
  return withStoreMutation((store, { markDirty }) => {
    const room = authenticateHost(store, input.slug, input.hostToken);
    const didChange = lockAndScoreRound(store, room, nowIso());

    if (didChange) {
      markDirty();
    }

    return { ok: true };
  });
}

export async function revealRound(input: { slug: string; hostToken: string }) {
  return withStoreMutation((store, { markDirty }) => {
    const room = authenticateHost(store, input.slug, input.hostToken);
    const currentTime = nowIso();
    const currentRound = getCurrentRound(store, room);

    invariant(currentRound, "There is no active round to reveal.", 404);

    if (currentRound.phase === "open") {
      lockAndScoreRound(store, room, currentTime);
    }

    if (currentRound.phase !== "revealed") {
      currentRound.phase = "revealed";
      currentRound.revealedAt = currentTime;
      room.updatedAt = currentTime;
      markDirty();
    }

    return { ok: true };
  });
}

export async function resetGame(input: { slug: string; hostToken: string }) {
  return withStoreMutation((store, { markDirty }) => {
    const room = authenticateHost(store, input.slug, input.hostToken);
    const currentRound = getCurrentRound(store, room);

    if (currentRound && currentRound.phase !== "revealed") {
      throw new GameError(409, "Finish the current round before starting a new game.");
    }

    const currentTime = nowIso();
    const roomRounds = listRoomRounds(store, room.id);

    for (const player of listRoomPlayers(store, room.id)) {
      player.scoreTotal = 0;
    }

    for (const round of roomRounds) {
      delete store.rounds[round.id];

      for (const guess of listRoundGuesses(store, round.id)) {
        delete store.guesses[guess.id];
      }
    }

    room.currentRoundId = null;
    room.updatedAt = currentTime;
    markDirty();

    return { ok: true };
  });
}

export async function submitGuess(input: { roundId: string; playerToken: string; guess: string; promptRevision: number }) {
  const result = await withStoreMutation((store, { markDirty }) => {
    const round = store.rounds[input.roundId];
    invariant(round, "Round not found.", 404);

    const room = store.rooms[round.roomId];
    invariant(room, "Room not found.", 404);

    const player = authenticatePlayer(store, room.id, input.playerToken);
    const currentTime = nowIso();

    if (round.phase === "open" && Date.now() >= new Date(round.locksAt).getTime()) {
      const didChange = lockAndScoreRound(store, room, currentTime);
      if (didChange) {
        markDirty();
      }

      return { status: "locked" as const };
    }

    invariant(round.phase === "open", "This round is no longer accepting guesses.", 409);
    invariant(
      input.promptRevision === getPromptRevision(round),
      "The prompt changed. Review the new prompt and submit again.",
      409,
    );

    const parsedGuess = parseGuessInput(input.guess);
    const existingGuess = findGuessByRoundAndPlayer(store, round.id, player.id);

    if (existingGuess) {
      existingGuess.guessNumeric = parsedGuess.normalizedValue;
      existingGuess.guessRaw = input.guess.trim();
      existingGuess.updatedAt = currentTime;
      existingGuess.isBust = null;
      existingGuess.distanceUnder = null;
      existingGuess.rank = null;
      existingGuess.pointsAwarded = 0;
      existingGuess.isWinner = false;
    } else {
      assignGuess(store, {
        id: crypto.randomUUID(),
        roundId: round.id,
        playerId: player.id,
        guessNumeric: parsedGuess.normalizedValue,
        guessRaw: input.guess.trim(),
        submittedAt: currentTime,
        updatedAt: currentTime,
        isBust: null,
        distanceUnder: null,
        rank: null,
        pointsAwarded: 0,
        isWinner: false,
      });
    }

    player.lastSeenAt = currentTime;
    room.updatedAt = currentTime;
    markDirty();

    return {
      status: "ok" as const,
      ok: true,
      normalizedGuess: parsedGuess.normalizedValue,
      displayGuess: formatPromptNumericValue(parsedGuess.normalizedValue, {
        category: round.category,
        unitLabel: round.promptUnitLabel,
        unitShort: round.promptUnitShort,
      }),
    };
  });

  if (result.status === "locked") {
    throw new GameError(409, "That round just locked.");
  }

  return result;
}
