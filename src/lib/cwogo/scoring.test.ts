import { describe, expect, it } from "vitest";
import { serializeHostState, serializePlayerState } from "./serializers";
import { scoreGuessRows } from "./scoring";
import { EXACT_BONUS_POINTS } from "./constants";
import type { CwogoGuessStore, CwogoPlayerStore, CwogoRoomStore, CwogoRoundStore } from "@/types/cwogo";

function createGuess(playerNumber: number, guessNumeric: number): CwogoGuessStore {
  const id = `p${playerNumber}`;
  const timestamp = new Date(Date.UTC(2026, 0, 1, 0, playerNumber)).toISOString();

  return {
    id,
    roundId: "round-1",
    playerId: id,
    guessNumeric,
    guessRaw: String(guessNumeric),
    submittedAt: timestamp,
    updatedAt: timestamp,
    isBust: null,
    distanceUnder: null,
    rank: null,
    pointsAwarded: 0,
    isWinner: false,
  };
}

function getResultById(scoredGuesses: ReturnType<typeof scoreGuessRows>["scoredGuesses"], id: string) {
  const guess = scoredGuesses.find((entry) => entry.id === id);
  expect(guess).toBeDefined();
  return guess!;
}

describe("scoreGuessRows", () => {
  it("awards only first place in rounds with up to four submissions", () => {
    const result = scoreGuessRows(100, [90, 80, 70, 60].map((guess, index) => createGuess(index + 1, guess)));

    expect(result.winnerPlayerIds).toEqual(["p1"]);
    expect(getResultById(result.scoredGuesses, "p1")).toMatchObject({ rank: 1, pointsAwarded: 1, isWinner: true });
    expect(getResultById(result.scoredGuesses, "p2")).toMatchObject({ rank: 2, pointsAwarded: 0, isWinner: false });
  });

  it("awards first and second place in rounds with five to seven submissions", () => {
    const result = scoreGuessRows(100, [99, 98, 97, 96, 95, 94].map((guess, index) => createGuess(index + 1, guess)));

    expect(getResultById(result.scoredGuesses, "p1")).toMatchObject({ rank: 1, pointsAwarded: 2, isWinner: true });
    expect(getResultById(result.scoredGuesses, "p2")).toMatchObject({ rank: 2, pointsAwarded: 1, isWinner: false });
    expect(getResultById(result.scoredGuesses, "p3")).toMatchObject({ rank: 3, pointsAwarded: 0, isWinner: false });
  });

  it("awards the podium in rounds with eight or more submissions", () => {
    const result = scoreGuessRows(100, [99, 98, 97, 96, 95, 94, 93, 92].map((guess, index) => createGuess(index + 1, guess)));

    expect(getResultById(result.scoredGuesses, "p1")).toMatchObject({ rank: 1, pointsAwarded: 3, isWinner: true });
    expect(getResultById(result.scoredGuesses, "p2")).toMatchObject({ rank: 2, pointsAwarded: 2, isWinner: false });
    expect(getResultById(result.scoredGuesses, "p3")).toMatchObject({ rank: 3, pointsAwarded: 1, isWinner: false });
    expect(getResultById(result.scoredGuesses, "p4")).toMatchObject({ rank: 4, pointsAwarded: 0, isWinner: false });
  });

  it("skips second place after a tie for first", () => {
    const result = scoreGuessRows(100, [99, 99, 97, 96, 95, 94, 93, 92].map((guess, index) => createGuess(index + 1, guess)));

    expect(result.winnerPlayerIds).toEqual(["p1", "p2"]);
    expect(getResultById(result.scoredGuesses, "p1")).toMatchObject({ rank: 1, pointsAwarded: 3, isWinner: true });
    expect(getResultById(result.scoredGuesses, "p2")).toMatchObject({ rank: 1, pointsAwarded: 3, isWinner: true });
    expect(getResultById(result.scoredGuesses, "p3")).toMatchObject({ rank: 3, pointsAwarded: 1, isWinner: false });
  });

  it("skips third place after a tie for second", () => {
    const result = scoreGuessRows(100, [99, 98, 98, 96, 95, 94, 93, 92].map((guess, index) => createGuess(index + 1, guess)));

    expect(getResultById(result.scoredGuesses, "p1")).toMatchObject({ rank: 1, pointsAwarded: 3, isWinner: true });
    expect(getResultById(result.scoredGuesses, "p2")).toMatchObject({ rank: 2, pointsAwarded: 2, isWinner: false });
    expect(getResultById(result.scoredGuesses, "p3")).toMatchObject({ rank: 2, pointsAwarded: 2, isWinner: false });
    expect(getResultById(result.scoredGuesses, "p4")).toMatchObject({ rank: 4, pointsAwarded: 0, isWinner: false });
  });

  it("does not award points when everybody busts or nobody submits", () => {
    const bustResult = scoreGuessRows(100, [101, 102].map((guess, index) => createGuess(index + 1, guess)));
    const emptyResult = scoreGuessRows(100, []);

    expect(bustResult.noWinner).toBe(true);
    expect(bustResult.winnerPlayerIds).toEqual([]);
    expect(bustResult.scoredGuesses).toEqual([
      expect.objectContaining({ id: "p1", isBust: true, pointsAwarded: 0, rank: null }),
      expect.objectContaining({ id: "p2", isBust: true, pointsAwarded: 0, rank: null }),
    ]);

    expect(emptyResult.noWinner).toBe(true);
    expect(emptyResult.winnerPlayerIds).toEqual([]);
    expect(emptyResult.scoredGuesses).toEqual([]);
  });

  it("adds the exact bonus in rounds with up to four submissions", () => {
    const result = scoreGuessRows(100, [100, 99, 98, 97].map((guess, index) => createGuess(index + 1, guess)));

    expect(getResultById(result.scoredGuesses, "p1")).toMatchObject({
      rank: 1,
      pointsAwarded: 1 + EXACT_BONUS_POINTS,
      isWinner: true,
      status: "exact",
    });
    expect(getResultById(result.scoredGuesses, "p2")).toMatchObject({ rank: 2, pointsAwarded: 0, isWinner: false });
  });

  it("adds the exact bonus in rounds with five to seven submissions", () => {
    const result = scoreGuessRows(100, [100, 99, 98, 97, 96, 95].map((guess, index) => createGuess(index + 1, guess)));

    expect(getResultById(result.scoredGuesses, "p1")).toMatchObject({
      rank: 1,
      pointsAwarded: 2 + EXACT_BONUS_POINTS,
      isWinner: true,
      status: "exact",
    });
    expect(getResultById(result.scoredGuesses, "p2")).toMatchObject({ rank: 2, pointsAwarded: 1, isWinner: false });
  });

  it("adds the exact bonus in rounds with eight or more submissions", () => {
    const result = scoreGuessRows(100, [100, 99, 98, 97, 96, 95, 94, 93].map((guess, index) => createGuess(index + 1, guess)));

    expect(getResultById(result.scoredGuesses, "p1")).toMatchObject({
      rank: 1,
      pointsAwarded: 3 + EXACT_BONUS_POINTS,
      isWinner: true,
      status: "exact",
    });
    expect(getResultById(result.scoredGuesses, "p2")).toMatchObject({ rank: 2, pointsAwarded: 2, isWinner: false });
  });

  it("awards the full exact bonus to every exact first-place tie", () => {
    const result = scoreGuessRows(100, [100, 100, 97, 96, 95, 94, 93, 92].map((guess, index) => createGuess(index + 1, guess)));

    expect(result.winnerPlayerIds).toEqual(["p1", "p2"]);
    expect(getResultById(result.scoredGuesses, "p1")).toMatchObject({
      rank: 1,
      pointsAwarded: 3 + EXACT_BONUS_POINTS,
      isWinner: true,
      status: "exact",
    });
    expect(getResultById(result.scoredGuesses, "p2")).toMatchObject({
      rank: 1,
      pointsAwarded: 3 + EXACT_BONUS_POINTS,
      isWinner: true,
      status: "exact",
    });
    expect(getResultById(result.scoredGuesses, "p3")).toMatchObject({ rank: 3, pointsAwarded: 1, isWinner: false });
  });
});

describe("serializeHostState", () => {
  it("defaults missing stored pointsAwarded values to zero", () => {
    const room: CwogoRoomStore = {
      id: "room-1",
      slug: "room-1",
      joinCode: "ABC123",
      title: "Test Room",
      adminTokenHash: "host",
      currentRoundId: "round-1",
      defaultPack: "mixed",
      defaultRoundSeconds: 25,
      maxRounds: 5,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const round: CwogoRoundStore = {
      id: "round-1",
      roomId: room.id,
      roundNumber: 1,
      phase: "revealed",
      promptId: "prompt-1",
      promptText: "How tall?",
      promptUnitLabel: "feet",
      promptUnitShort: "ft",
      answerNumeric: 100,
      answerDisplay: "100 ft",
      hintText: null,
      pack: "mixed",
      category: "Test",
      difficulty: 1,
      opensAt: "2026-01-01T00:00:00.000Z",
      locksAt: "2026-01-01T00:00:25.000Z",
      lockedAt: "2026-01-01T00:00:25.000Z",
      revealedAt: "2026-01-01T00:00:30.000Z",
      scoreApplied: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const players: CwogoPlayerStore[] = [
      {
        id: "p1",
        roomId: room.id,
        displayName: "Alice",
        sessionTokenHash: "token",
        scoreTotal: 1,
        joinedAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: "2026-01-01T00:00:30.000Z",
        isActive: true,
      },
    ];
    const legacyGuess = {
      ...createGuess(1, 99),
      isBust: false,
      distanceUnder: 1,
      rank: 1,
      isWinner: true,
    } as CwogoGuessStore;
    delete (legacyGuess as Partial<CwogoGuessStore>).pointsAwarded;

    const state = serializeHostState({
      room,
      roomVersion: 1,
      round,
      rounds: [round],
      players,
      guesses: [legacyGuess],
      serverNow: "2026-01-01T00:00:31.000Z",
    });

    expect(state.currentRound?.results?.revealedGuesses[0]).toMatchObject({
      playerId: "p1",
      pointsAwarded: 0,
      isWinner: true,
    });
  });

  it("displays year-valued answers and guesses without thousands separators", () => {
    const room: CwogoRoomStore = {
      id: "room-1",
      slug: "room-1",
      joinCode: "ABC123",
      title: "Test Room",
      adminTokenHash: "host",
      currentRoundId: "round-1",
      defaultPack: "tech",
      defaultRoundSeconds: 25,
      maxRounds: 5,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const round: CwogoRoundStore = {
      id: "round-1",
      roomId: room.id,
      roundNumber: 1,
      phase: "revealed",
      promptId: "prompt-1",
      promptText: "Year the JPEG standard was first published",
      promptUnitLabel: "year",
      promptUnitShort: "year",
      answerNumeric: 1992,
      answerDisplay: "1,992",
      hintText: null,
      pack: "tech",
      category: "Year",
      difficulty: 2,
      opensAt: "2026-01-01T00:00:00.000Z",
      locksAt: "2026-01-01T00:00:25.000Z",
      lockedAt: "2026-01-01T00:00:25.000Z",
      revealedAt: "2026-01-01T00:00:30.000Z",
      scoreApplied: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const players: CwogoPlayerStore[] = [
      {
        id: "p1",
        roomId: room.id,
        displayName: "Alice",
        sessionTokenHash: "token-1",
        scoreTotal: 1,
        joinedAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: "2026-01-01T00:00:30.000Z",
        isActive: true,
      },
      {
        id: "p2",
        roomId: room.id,
        displayName: "Bob",
        sessionTokenHash: "token-2",
        scoreTotal: 0,
        joinedAt: "2026-01-01T00:00:05.000Z",
        lastSeenAt: "2026-01-01T00:00:30.000Z",
        isActive: true,
      },
    ];
    const guesses: CwogoGuessStore[] = [
      {
        ...createGuess(1, 1990),
        isBust: false,
        distanceUnder: 2,
        rank: 1,
        pointsAwarded: 1,
        isWinner: true,
      },
      {
        ...createGuess(2, 1994),
        isBust: true,
        distanceUnder: null,
        rank: null,
        pointsAwarded: 0,
        isWinner: false,
      },
    ];

    const hostState = serializeHostState({
      room,
      roomVersion: 1,
      round,
      rounds: [round],
      players,
      guesses,
      serverNow: "2026-01-01T00:00:31.000Z",
    });
    const playerState = serializePlayerState({
      room,
      roomVersion: 1,
      round: {
        ...round,
        phase: "open",
        revealedAt: null,
        lockedAt: null,
        scoreApplied: false,
      },
      rounds: [],
      players,
      guesses: [
        {
          ...createGuess(1, 1991),
          isBust: null,
          distanceUnder: null,
          rank: null,
          pointsAwarded: 0,
          isWinner: false,
        },
      ],
      me: players[0],
      serverNow: "2026-01-01T00:00:10.000Z",
    });

    expect(hostState.currentRound?.results?.answerDisplay).toBe("1992");
    expect(hostState.currentRound?.results?.revealedGuesses.map((guess) => guess.guessDisplay)).toEqual([
      "1990",
      "1994",
    ]);
    expect(playerState.myGuess?.displayGuess).toBe("1991");
  });
});
