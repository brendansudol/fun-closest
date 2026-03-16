"use client";

import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/lib/game/fetcher";
import type { HostRoomState } from "@/types/game";

export function useHostRoomState(slug: string) {
  return useQuery({
    queryKey: ["game", "host-room", slug],
    queryFn: () => requestJson<HostRoomState>(`/api/inkling/rooms/${slug}/state`),
    refetchInterval: (query) => {
      const data = query.state.data as HostRoomState | undefined;

      if (!data?.currentRound) {
        return 3_000;
      }

      return data.currentRound.phase === "open" || data.currentRound.phase === "locked" ? 1_000 : 3_000;
    },
    refetchIntervalInBackground: true,
  });
}
