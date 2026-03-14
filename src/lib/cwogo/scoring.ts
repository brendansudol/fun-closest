import type { CwogoGuessStore } from "@/types/cwogo";
import { EXACT_BONUS_POINTS } from "./constants";

type ScoredGuess = {
  id: string;
  isBust: boolean;
  distanceUnder: number | null;
  rank: number | null;
  pointsAwarded: number;
  isWinner: boolean;
  isExact: boolean;
  status: "winner" | "exact" | "under" | "bust";
};

const PODIUM_PAYOUTS: ReadonlyArray<{ minSubmittedGuesses: number; pointsByRank: Record<number, number> }> = [
  { minSubmittedGuesses: 8, pointsByRank: { 1: 3, 2: 2, 3: 1 } },
  { minSubmittedGuesses: 5, pointsByRank: { 1: 2, 2: 1 } },
  { minSubmittedGuesses: 0, pointsByRank: { 1: 1 } },
];

function getPointsByRank(submittedGuessCount: number) {
  return PODIUM_PAYOUTS.find((tier) => submittedGuessCount >= tier.minSubmittedGuesses)?.pointsByRank ?? { 1: 1 };
}

export function scoreGuessRows(answerNumeric: number, guesses: CwogoGuessStore[]) {
  const base = guesses.map((guess) => {
    const isBust = guess.guessNumeric > answerNumeric;
    const distanceUnder = isBust ? null : answerNumeric - guess.guessNumeric;

    return {
      guess,
      isBust,
      distanceUnder,
      isExact: guess.guessNumeric === answerNumeric,
    };
  });

  const eligible = base
    .filter((entry) => !entry.isBust)
    .sort((left, right) => {
      if ((left.distanceUnder ?? 0) !== (right.distanceUnder ?? 0)) {
        return (left.distanceUnder ?? 0) - (right.distanceUnder ?? 0);
      }

      if (left.guess.guessNumeric !== right.guess.guessNumeric) {
        return right.guess.guessNumeric - left.guess.guessNumeric;
      }

      return left.guess.submittedAt.localeCompare(right.guess.submittedAt);
    });

  const winnerDistance = eligible[0]?.distanceUnder ?? null;
  const winnerIds =
    winnerDistance === null
      ? []
      : eligible.filter((entry) => entry.distanceUnder === winnerDistance).map((entry) => entry.guess.playerId);

  let nextRank = 1;

  const scored = base.map<ScoredGuess>((entry) => {
    if (entry.isBust) {
      return {
        id: entry.guess.id,
        isBust: true,
        distanceUnder: null,
        rank: null,
        pointsAwarded: 0,
        isWinner: false,
        isExact: false,
        status: "bust",
      };
    }

    return {
      id: entry.guess.id,
      isBust: false,
      distanceUnder: entry.distanceUnder,
      rank: null,
      pointsAwarded: 0,
      isWinner: false,
      isExact: entry.isExact,
      status: "under",
    };
  });

  const pointsByRank = getPointsByRank(guesses.length);
  let index = 0;

  while (index < eligible.length) {
    const currentDistance = eligible[index]?.distanceUnder ?? null;
    let groupEnd = index + 1;

    while (groupEnd < eligible.length && eligible[groupEnd]?.distanceUnder === currentDistance) {
      groupEnd += 1;
    }

    const tiedEntries = eligible.slice(index, groupEnd);
    const rank = nextRank;
    const basePoints = pointsByRank[rank] ?? 0;

    for (const entry of tiedEntries) {
      const scoredEntry = scored.find((item) => item.id === entry.guess.id);
      if (!scoredEntry) {
        continue;
      }

      const isWinner = rank === 1;
      scoredEntry.rank = rank;
      scoredEntry.pointsAwarded = basePoints + (entry.isExact ? EXACT_BONUS_POINTS : 0);
      scoredEntry.isWinner = isWinner;
      scoredEntry.status = entry.isExact && isWinner ? "exact" : isWinner ? "winner" : "under";
    }

    index = groupEnd;
    nextRank += tiedEntries.length;
  }

  return {
    noWinner: winnerIds.length === 0,
    winnerPlayerIds: winnerIds,
    scoredGuesses: scored,
  };
}
