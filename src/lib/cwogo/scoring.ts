import type { CwogoGuessStore } from "@/types/cwogo";

type ScoredGuess = {
  id: string;
  isBust: boolean;
  distanceUnder: number | null;
  rank: number | null;
  isWinner: boolean;
  isExact: boolean;
  status: "winner" | "exact" | "under" | "bust";
};

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

  let nextRank = winnerIds.length > 0 ? 2 : 1;

  const scored = base.map<ScoredGuess>((entry) => {
    if (entry.isBust) {
      return {
        id: entry.guess.id,
        isBust: true,
        distanceUnder: null,
        rank: null,
        isWinner: false,
        isExact: false,
        status: "bust",
      };
    }

    const isWinner = winnerIds.includes(entry.guess.playerId);

    return {
      id: entry.guess.id,
      isBust: false,
      distanceUnder: entry.distanceUnder,
      rank: isWinner ? 1 : null,
      isWinner,
      isExact: entry.isExact,
      status: entry.isExact && isWinner ? "exact" : isWinner ? "winner" : "under",
    };
  });

  for (const entry of eligible) {
    if (winnerIds.includes(entry.guess.playerId)) {
      continue;
    }

    const scoredEntry = scored.find((item) => item.id === entry.guess.id);
    if (scoredEntry) {
      scoredEntry.rank = nextRank;
      nextRank += 1;
    }
  }

  return {
    noWinner: winnerIds.length === 0,
    winnerPlayerIds: winnerIds,
    scoredGuesses: scored,
  };
}
