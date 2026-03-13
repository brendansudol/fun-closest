import { DEFAULT_ROOM_TITLE } from "./constants";
import { formatNumericValue, formatPromptNumericValue, isYearValuePrompt } from "./format";
import { getGameWinnerPlayerIds, getRoomMaxRounds, getRoundsRemaining, isGameOver } from "./game";
import type {
  CwogoGuessStore,
  CwogoPlayerStore,
  CwogoRoomStore,
  CwogoRoundStore,
  HostRoomState,
  PlayerRoomState,
  RevealedGuess,
  RoundResults,
  RoundSummary,
} from "@/types/cwogo";

function buildRoomMeta(room: CwogoRoomStore, roomVersion: number) {
  return {
    slug: room.slug,
    title: room.title || DEFAULT_ROOM_TITLE,
    joinCode: room.joinCode,
    joinPath: `/cwogo/join/${room.joinCode}`,
    defaultPack: room.defaultPack,
    defaultRoundSeconds: room.defaultRoundSeconds,
    maxRounds: getRoomMaxRounds(room),
    roomVersion,
  };
}

function buildGameSummary(input: {
  room: CwogoRoomStore;
  round: CwogoRoundStore | null;
  rounds: CwogoRoundStore[];
  players: CwogoPlayerStore[];
}) {
  const maxRounds = getRoomMaxRounds(input.room);
  const roundsPlayed = input.rounds.length;
  const gameOver = isGameOver({
    room: input.room,
    roundsPlayed,
    currentRound: input.round,
  });

  return {
    maxRounds,
    roundsPlayed,
    roundsRemaining: getRoundsRemaining(maxRounds, roundsPlayed),
    isGameOver: gameOver,
    winnerPlayerIds: gameOver ? getGameWinnerPlayerIds(input.players) : [],
  };
}

function buildScoreboard(players: CwogoPlayerStore[], meId?: string) {
  return [...players]
    .sort((left, right) => {
      if (left.scoreTotal !== right.scoreTotal) {
        return right.scoreTotal - left.scoreTotal;
      }

      return left.joinedAt.localeCompare(right.joinedAt);
    })
    .map((player) => ({
      playerId: player.id,
      displayName: player.displayName,
      scoreTotal: player.scoreTotal,
      isMe: player.id === meId,
    }));
}

function formatRoundNumericValue(
  value: number,
  round: Pick<CwogoRoundStore, "category" | "promptUnitLabel" | "promptUnitShort">,
) {
  return formatPromptNumericValue(value, {
    category: round.category,
    unitLabel: round.promptUnitLabel,
    unitShort: round.promptUnitShort,
  });
}

function getRoundAnswerDisplay(round: CwogoRoundStore) {
  const isYearPrompt = isYearValuePrompt({
    category: round.category,
    unitLabel: round.promptUnitLabel,
    unitShort: round.promptUnitShort,
  });

  if (!isYearPrompt) {
    return round.answerDisplay;
  }

  if (round.answerDisplay === formatNumericValue(round.answerNumeric)) {
    return formatRoundNumericValue(round.answerNumeric, round);
  }

  return round.answerDisplay;
}

function buildRevealedGuesses(
  round: CwogoRoundStore,
  players: CwogoPlayerStore[],
  guesses: CwogoGuessStore[],
  meId?: string,
) {
  const playerMap = new Map(players.map((player) => [player.id, player]));

  return guesses
    .map<RevealedGuess>((guess) => {
      const player = playerMap.get(guess.playerId);
      const isExact = guess.guessNumeric === round.answerNumeric && guess.isWinner;

      return {
        playerId: guess.playerId,
        displayName: player?.displayName ?? "Unknown",
        guessNumeric: guess.guessNumeric,
        guessDisplay: formatRoundNumericValue(guess.guessNumeric, round),
        guessRaw: guess.guessRaw,
        isBust: guess.isBust ?? false,
        isWinner: guess.isWinner,
        isExact,
        distanceUnder: guess.distanceUnder,
        rank: guess.rank,
        pointsAwarded: guess.pointsAwarded ?? 0,
        status: guess.isBust ? "bust" : isExact ? "exact" : guess.isWinner ? "winner" : "under",
        submittedAt: guess.submittedAt,
        isMe: guess.playerId === meId,
      };
    })
    .sort((left, right) => {
      if (left.isBust !== right.isBust) {
        return left.isBust ? 1 : -1;
      }

      if ((left.rank ?? 999) !== (right.rank ?? 999)) {
        return (left.rank ?? 999) - (right.rank ?? 999);
      }

      return right.guessNumeric - left.guessNumeric;
    });
}

function buildResults(round: CwogoRoundStore, players: CwogoPlayerStore[], guesses: CwogoGuessStore[], meId?: string) {
  const revealedGuesses = buildRevealedGuesses(round, players, guesses, meId);

  return {
    answerNumeric: round.answerNumeric,
    answerDisplay: getRoundAnswerDisplay(round),
    winnerPlayerIds: revealedGuesses.filter((guess) => guess.isWinner).map((guess) => guess.playerId),
    noWinner: revealedGuesses.length === 0 || revealedGuesses.every((guess) => guess.isBust),
    revealedGuesses,
  } satisfies RoundResults;
}

function buildRoundSummary(
  round: CwogoRoundStore | null,
  players: CwogoPlayerStore[],
  guesses: CwogoGuessStore[],
  serverNow: string,
  meId?: string,
) {
  if (!round) {
    return null;
  }

  const summary: RoundSummary = {
    id: round.id,
    roundNumber: round.roundNumber,
    phase: round.phase,
    pack: round.pack,
    category: round.category,
    promptText: round.promptText,
    promptUnitLabel: round.promptUnitLabel,
    promptUnitShort: round.promptUnitShort,
    hintText: round.hintText,
    opensAt: round.opensAt,
    locksAt: round.locksAt,
    lockedAt: round.lockedAt,
    revealedAt: round.revealedAt,
    serverNow,
    totalPlayers: players.length,
    submittedCount: guesses.length,
  };

  if (round.phase === "revealed") {
    summary.results = buildResults(round, players, guesses, meId);
  }

  return summary;
}

export function serializeHostState(input: {
  room: CwogoRoomStore;
  roomVersion: number;
  round: CwogoRoundStore | null;
  rounds: CwogoRoundStore[];
  players: CwogoPlayerStore[];
  guesses: CwogoGuessStore[];
  serverNow: string;
}) {
  const submittedPlayerIds = new Set(input.guesses.map((guess) => guess.playerId));
  const game = buildGameSummary(input);

  const players = input.players.map((player) => ({
    id: player.id,
    displayName: player.displayName,
    scoreTotal: player.scoreTotal,
    hasSubmitted: submittedPlayerIds.has(player.id),
    joinedAt: player.joinedAt,
  }));

  return {
    role: "host",
    room: buildRoomMeta(input.room, input.roomVersion),
    game,
    players,
    scoreboard: buildScoreboard(input.players),
    currentRound: buildRoundSummary(input.round, input.players, input.guesses, input.serverNow),
    canStartRound: (!input.round || input.round.phase === "revealed") && !game.isGameOver,
  } satisfies HostRoomState;
}

export function serializePlayerState(input: {
  room: CwogoRoomStore;
  roomVersion: number;
  round: CwogoRoundStore | null;
  rounds: CwogoRoundStore[];
  players: CwogoPlayerStore[];
  guesses: CwogoGuessStore[];
  me: CwogoPlayerStore;
  serverNow: string;
}) {
  const myGuess = input.guesses.find((guess) => guess.playerId === input.me.id) ?? null;
  const game = buildGameSummary(input);

  return {
    role: "player",
    room: buildRoomMeta(input.room, input.roomVersion),
    game,
    me: {
      id: input.me.id,
      displayName: input.me.displayName,
      scoreTotal: input.me.scoreTotal,
    },
    players: input.players.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      scoreTotal: player.scoreTotal,
      joinedAt: player.joinedAt,
    })),
    scoreboard: buildScoreboard(input.players, input.me.id),
    currentRound: buildRoundSummary(input.round, input.players, input.guesses, input.serverNow, input.me.id),
    myGuess: myGuess
      ? {
          guessNumeric: myGuess.guessNumeric,
          guessRaw: myGuess.guessRaw,
          displayGuess: input.round ? formatRoundNumericValue(myGuess.guessNumeric, input.round) : formatNumericValue(myGuess.guessNumeric),
          updatedAt: myGuess.updatedAt,
        }
      : null,
    canStartRound: (!input.round || input.round.phase === "revealed") && !game.isGameOver,
  } satisfies PlayerRoomState;
}
