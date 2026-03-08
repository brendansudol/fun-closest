"use client";

import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/lib/cwogo/fetcher";
import type { HostRoomState } from "@/types/cwogo";

export function useHostRoomState(slug: string) {
  return useQuery({
    queryKey: ["cwogo", "host-room", slug],
    queryFn: () => requestJson<HostRoomState>(`/api/cwogo/rooms/${slug}/state`),
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
