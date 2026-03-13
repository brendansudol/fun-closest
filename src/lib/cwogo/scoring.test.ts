import { describe, expect, it } from "vitest";
import { serializeHostState } from "./serializers";
import { scoreGuessRows } from "./scoring";
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

  it("treats an exact match as first place without an extra bonus", () => {
    const result = scoreGuessRows(100, [100, 99, 98, 97, 96].map((guess, index) => createGuess(index + 1, guess)));

    expect(getResultById(result.scoredGuesses, "p1")).toMatchObject({
      rank: 1,
      pointsAwarded: 2,
      isWinner: true,
      status: "exact",
    });
    expect(getResultById(result.scoredGuesses, "p2")).toMatchObject({ rank: 2, pointsAwarded: 1, isWinner: false });
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
});
