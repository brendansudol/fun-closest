"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJson } from "@/lib/cwogo/fetcher";

type JoinRoomResponse = {
  roomSlug: string;
  playerUrl: string;
};

export function JoinRoomForm({ code }: { code: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");

  const joinMutation = useMutation({
    mutationFn: () =>
      requestJson<JoinRoomResponse>("/api/cwogo/join", {
        method: "POST",
        body: JSON.stringify({
          joinCode: code,
          displayName,
        }),
      }),
    onSuccess: (payload) => {
      router.push(payload.playerUrl);
    },
  });

  return (
    <div className="mx-auto max-w-xl">
      <section className="glass-card rounded-[2.25rem] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-muted">Join room</p>
        <h1 className="mt-3 font-serif text-4xl text-foreground sm:text-5xl">{code}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">
          Pick a display name and you&apos;ll land on the player screen for this room.
        </p>

        <form
          className="mt-8 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            joinMutation.mutate();
          }}
        >
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ava"
              className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-lg outline-none focus:border-accent"
            />
          </label>

          <button
            type="submit"
            disabled={joinMutation.isPending}
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-accent px-6 text-lg font-semibold text-white shadow-[0_16px_30px_rgba(239,109,68,0.32)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {joinMutation.isPending ? "Joining..." : "Join room"}
          </button>

          {joinMutation.isError ? (
            <p className="rounded-2xl border border-bust/30 bg-bust/10 px-4 py-3 text-sm text-bust">
              {joinMutation.error.message}
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
