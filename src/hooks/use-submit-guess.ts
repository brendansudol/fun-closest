"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/lib/game/fetcher";

export function useSubmitGuess(roundId: string, promptRevision: number, slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (guess: string) =>
      requestJson<{ ok: true; normalizedGuess: number; displayGuess: string }>(
        `/api/inkling/rounds/${roundId}/guess`,
        {
          method: "POST",
          body: JSON.stringify({ guess, promptRevision }),
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["game", "player-room", slug] });
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey: ["game", "player-room", slug] });
    },
  });
}
