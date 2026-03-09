import type { CwogoPlayerStore, CwogoRoomStore, CwogoRoundStore } from "@/types/cwogo";

export function getRoomMaxRounds(room: CwogoRoomStore) {
  return room.maxRounds ?? null;
}

export function getRoundsRemaining(maxRounds: number | null, roundsPlayed: number) {
  if (maxRounds === null) {
    return null;
  }

  return Math.max(maxRounds - roundsPlayed, 0);
}

export function isGameOver(params: {
  room: CwogoRoomStore;
  roundsPlayed: number;
  currentRound: CwogoRoundStore | null;
}) {
  const maxRounds = getRoomMaxRounds(params.room);

  if (maxRounds === null) {
    return false;
  }

  return params.roundsPlayed >= maxRounds && (!params.currentRound || params.currentRound.phase === "revealed");
}

export function getGameWinnerPlayerIds(players: CwogoPlayerStore[]) {
  if (players.length === 0) {
    return [];
  }

  const topScore = Math.max(...players.map((player) => player.scoreTotal));

  return players.filter((player) => player.scoreTotal === topScore).map((player) => player.id);
}
