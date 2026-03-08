"use client";

import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/lib/cwogo/fetcher";
import type { PlayerRoomState } from "@/types/cwogo";

export function usePlayerRoomState(slug: string) {
  return useQuery({
    queryKey: ["cwogo", "player-room", slug],
    queryFn: () => requestJson<PlayerRoomState>(`/api/cwogo/rooms/${slug}/state`),
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
