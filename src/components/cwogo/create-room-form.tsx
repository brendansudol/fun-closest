"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_ROUND_SECONDS } from "@/lib/cwogo/constants";
import { requestJson } from "@/lib/cwogo/fetcher";

type CreateRoomResponse = {
  roomSlug: string;
  joinCode: string;
  hostUrl: string;
};

const DEFAULT_CREATE_PACK = "mixed";
const DEFAULT_CREATE_MAX_ROUNDS = 10;

export function CreateRoomForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const createRoomMutation = useMutation({
    mutationFn: () =>
      requestJson<CreateRoomResponse>("/api/cwogo/rooms", {
        method: "POST",
        body: JSON.stringify({
          title,
          defaultPack: DEFAULT_CREATE_PACK,
          defaultRoundSeconds: DEFAULT_ROUND_SECONDS,
          maxRounds: DEFAULT_CREATE_MAX_ROUNDS,
        }),
      }),
    onSuccess: (payload) => {
      router.push(payload.hostUrl);
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="glass-card rounded-[2.25rem] p-6 sm:p-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Host a room</p>
          <h1 className="mt-3 font-serif text-5xl leading-none text-foreground sm:text-6xl">
            Closest without going over.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
            Spin up a room, throw a number prompt on the shared screen, and let everyone submit private estimates from
            their phones. Nothing leaks until reveal.
          </p>
        </div>

        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            createRoomMutation.mutate();
          }}
        >
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">Room title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Friday retro"
              className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-base outline-none focus:border-accent"
            />
          </label>

          <button
            type="submit"
            disabled={createRoomMutation.isPending}
            className="mt-3 inline-flex min-h-14 items-center justify-center rounded-full bg-accent px-6 text-lg font-semibold text-white shadow-[0_16px_30px_rgba(239,109,68,0.32)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {createRoomMutation.isPending ? "Creating room..." : "Create host room"}
          </button>

          {createRoomMutation.isError ? (
            <p className="rounded-2xl border border-bust/30 bg-bust/10 px-4 py-3 text-sm text-bust">
              {createRoomMutation.error.message}
            </p>
          ) : null}
        </form>
      </section>

      <aside className="grid gap-6">
        <section className="glass-card rounded-[2.25rem] p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">How it works</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-muted">
            <p>1. Host starts a round and the prompt appears everywhere.</p>
            <p>2. Players submit one private numeric guess and can update it before lock.</p>
            <p>3. Highest guess that does not go over wins the point.</p>
          </div>
        </section>

        <section className="glass-card rounded-[2.25rem] p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Join a room</p>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!joinCode.trim()) {
                return;
              }

              router.push(`/cwogo/join/${joinCode.trim().toUpperCase()}`);
            }}
          >
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Enter join code"
              className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-base uppercase outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-foreground/10 bg-white/80 px-4 font-semibold text-foreground hover:border-accent hover:text-accent-deep"
            >
              Go to join screen
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}
