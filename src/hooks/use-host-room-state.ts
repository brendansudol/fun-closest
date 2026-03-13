"use client";

import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/lib/cwogo/fetcher";
import type { HostRoomState } from "@/types/cwogo";

const ERROR_POLL_MS = 30_000;
const LOBBY_POLL_MS = 15_000;
const ACTIVE_ROUND_POLL_MS = 3_000;
const LOCKED_ROUND_POLL_MS = 2_000;
const REVEALED_ROUND_POLL_MS = 6_000;

export function useHostRoomState(slug: string) {
  return useQuery({
    queryKey: ["cwogo", "host-room", slug],
    queryFn: () => requestJson<HostRoomState>(`/api/cwogo/rooms/${slug}/state`),
    retry: false,
    refetchInterval: (query) => {
      if (query.state.error) {
        return ERROR_POLL_MS;
      }

      const data = query.state.data as HostRoomState | undefined;

      if (!data?.currentRound) {
        return LOBBY_POLL_MS;
      }

      if (data.currentRound.phase === "locked") {
        return LOCKED_ROUND_POLL_MS;
      }

      return data.currentRound.phase === "open" ? ACTIVE_ROUND_POLL_MS : REVEALED_ROUND_POLL_MS;
    },
    refetchIntervalInBackground: false,
  });
}
