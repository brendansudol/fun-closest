"use client";

import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/lib/game/fetcher";
import type { PlayerRoomState } from "@/types/game";

export function usePlayerRoomState(slug: string) {
  return useQuery({
    queryKey: ["game", "player-room", slug],
    queryFn: () => requestJson<PlayerRoomState>(`/api/inkling/rooms/${slug}/state`),
    refetchInterval: (query) => {
      const data = query.state.data as PlayerRoomState | undefined;

      if (!data?.currentRound) {
        return 3_000;
      }

      if (data.currentRound.phase === "revealed") {
        return 3_000;
      }

      if (data.currentRound.phase === "locked") {
        return 1_000;
      }

      return data.myGuess ? 1_500 : 1_000;
    },
    refetchIntervalInBackground: true,
  });
}
