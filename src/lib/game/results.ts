import type { RevealedGuess } from "@/types/game";

export function formatPlacementLabel(rank: number) {
  const mod100 = rank % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${rank}th`;
  }

  const mod10 = rank % 10;
  const suffix = mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
  return `${rank}${suffix}`;
}

export function formatPointsAwarded(pointsAwarded: number) {
  return `+${pointsAwarded}`;
}

export function buildRoundScoringSummary(
  results: RevealedGuess[],
  formatName: (result: RevealedGuess) => string = (result) => result.displayName,
) {
  const scorers = results.filter((result) => result.pointsAwarded > 0);

  if (scorers.length === 0) {
    return null;
  }

  return scorers
    .map((result) => {
      const placement = result.rank === null ? null : formatPlacementLabel(result.rank);
      const placementLabel = placement ? `${placement} ` : "";
      return `${formatName(result)} ${placementLabel}${formatPointsAwarded(result.pointsAwarded)}`.trim();
    })
    .join(", ");
}

export function getResultBadgeLabel(result: Pick<RevealedGuess, "isBust" | "isExact" | "rank" | "pointsAwarded">) {
  if (result.isBust) {
    return "bust";
  }

  if (result.pointsAwarded > 0 && result.rank !== null) {
    return result.isExact ? `exact ${formatPlacementLabel(result.rank)}` : formatPlacementLabel(result.rank);
  }

  return "under";
}

export function getResultTone(result: Pick<RevealedGuess, "isWinner" | "isBust" | "pointsAwarded">) {
  if (result.isWinner) {
    return "winner" as const;
  }

  if (result.isBust) {
    return "bust" as const;
  }

  return result.pointsAwarded > 0 ? ("cool" as const) : ("neutral" as const);
}
