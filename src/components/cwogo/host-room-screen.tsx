"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { QrJoinCard } from "./qr-join-card";
import { ResultNumberLine } from "./result-number-line";
import { Scoreboard } from "./scoreboard";
import { PACK_OPTIONS } from "@/lib/cwogo/constants";
import { requestJson } from "@/lib/cwogo/fetcher";
import { formatCountdownLabel, formatPackLabel } from "@/lib/cwogo/format";
import { useHostRoomState } from "@/hooks/use-host-room-state";
import { useRoomCountdown } from "@/hooks/use-room-countdown";
import type { HostRoomState, Pack } from "@/types/cwogo";

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "winner" | "bust" | "cool" }) {
  const toneClass =
    tone === "winner"
      ? "border-winner/30 bg-winner/10 text-winner"
      : tone === "bust"
        ? "border-bust/30 bg-bust/10 text-bust"
        : tone === "cool"
          ? "border-accent-cool/30 bg-accent-cool/10 text-accent-cool"
          : "border-foreground/10 bg-white/70 text-foreground";

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClass}`}>{label}</span>;
}

function RosterList({ data }: { data: HostRoomState }) {
  return (
    <div className="space-y-3">
      {data.players.map((player) => (
        <div
          key={player.id}
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
            player.hasSubmitted ? "border-winner/30 bg-winner/10" : "border-line bg-white/60"
          }`}
        >
          <div>
            <p className="text-base font-semibold text-foreground">{player.displayName}</p>
            <p className="text-sm text-muted">{player.scoreTotal} pts</p>
          </div>
          <StatusPill label={player.hasSubmitted ? "Submitted" : "Waiting"} tone={player.hasSubmitted ? "winner" : "neutral"} />
        </div>
      ))}

      {data.players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          No players yet. Share the code or QR to bring people in.
        </div>
      ) : null}
    </div>
  );
}

function HostRoundBody({
  data,
  selectedPack,
  setSelectedPack,
  roundSeconds,
  setRoundSeconds,
  onStart,
  onLock,
  onReveal,
  startPending,
  lockPending,
  revealPending,
}: {
  data: HostRoomState;
  selectedPack: Pack;
  setSelectedPack: (value: Pack) => void;
  roundSeconds: number;
  setRoundSeconds: (value: number) => void;
  onStart: () => void;
  onLock: () => void;
  onReveal: () => void;
  startPending: boolean;
  lockPending: boolean;
  revealPending: boolean;
}) {
  const round = data.currentRound;
  const secondsRemaining = useRoomCountdown(round?.locksAt, round?.serverNow);

  if (!round) {
    return (
      <section className="glass-card rounded-[2.25rem] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-muted">Lobby</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="font-serif text-4xl text-foreground">Room is ready.</h2>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">
              Set the pack and the timer, let players join, then start the first prompt.
            </p>
          </div>
          <StatusPill label={`${data.players.length} players`} tone="cool" />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">Pack</span>
            <select
              value={selectedPack}
              onChange={(event) => setSelectedPack(event.target.value as Pack)}
              className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-base outline-none focus:border-accent"
            >
              {PACK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">Round length</span>
            <select
              value={roundSeconds}
              onChange={(event) => setRoundSeconds(Number(event.target.value))}
              className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-base outline-none focus:border-accent"
            >
              {[15, 20, 25, 30, 45, 60].map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds} seconds
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={startPending}
          className="mt-8 inline-flex min-h-14 items-center justify-center rounded-full bg-accent px-6 text-lg font-semibold text-white shadow-[0_16px_30px_rgba(239,109,68,0.32)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {startPending ? "Starting round..." : "Start round"}
        </button>
      </section>
    );
  }

  return (
    <section className="glass-card rounded-[2.25rem] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={`Round ${round.roundNumber}`} tone="cool" />
            <StatusPill label={formatPackLabel(round.pack)} />
            <StatusPill
              label={round.phase === "open" ? "Collecting guesses" : round.phase === "locked" ? "Locked" : "Revealed"}
              tone={round.phase === "revealed" ? "winner" : round.phase === "locked" ? "cool" : "neutral"}
            />
          </div>
          <h2 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">{round.promptText}</h2>
          <p className="mt-3 text-lg text-muted">
            Units: {round.promptUnitLabel}
            {round.hintText ? ` · ${round.hintText}` : ""}
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-accent/25 bg-white/70 px-5 py-4 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Countdown</p>
          <p className="mt-1 text-4xl font-semibold text-foreground">
            {round.phase === "open" ? formatCountdownLabel(secondsRemaining ?? 0) : "--:--"}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-line bg-white/55 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Submission progress</p>
            <p className="text-lg font-semibold text-foreground">
              {round.submittedCount} / {round.totalPlayers}
            </p>
          </div>
          <RosterList data={data} />
        </div>

        <div className="grid gap-4">
          {round.phase === "open" ? (
            <button
              type="button"
              onClick={onLock}
              disabled={lockPending}
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-foreground/10 bg-foreground px-6 text-lg font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {lockPending ? "Locking..." : "Lock now"}
            </button>
          ) : null}

          {round.phase === "locked" ? (
            <button
              type="button"
              onClick={onReveal}
              disabled={revealPending}
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-accent-cool px-6 text-lg font-semibold text-white shadow-[0_16px_30px_rgba(39,71,179,0.25)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {revealPending ? "Revealing..." : "Reveal results"}
            </button>
          ) : null}

          {round.phase === "revealed" ? (
            <button
              type="button"
              onClick={onStart}
              disabled={startPending}
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-accent px-6 text-lg font-semibold text-white shadow-[0_16px_30px_rgba(239,109,68,0.32)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {startPending ? "Starting..." : "Next round"}
            </button>
          ) : (
            <div className="rounded-[1.75rem] border border-line bg-white/55 p-5 text-sm leading-7 text-muted">
              The host only sees submission status before reveal. Guess values stay hidden until the round is scored and
              revealed.
            </div>
          )}
        </div>
      </div>

      {round.phase === "revealed" && round.results ? (
        <div className="mt-8 grid gap-6">
          <div className="rounded-[1.75rem] border border-line bg-white/55 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Outcome</p>
            <h3 className="mt-2 font-serif text-3xl text-foreground">
              {round.results.revealedGuesses.length === 0
                ? "No submissions this round."
                : round.results.noWinner
                  ? "No winner this round."
                  : `${round.results.revealedGuesses
                      .filter((guess) => guess.isWinner)
                      .map((guess) => guess.displayName)
                      .join(", ")} win${round.results.winnerPlayerIds.length > 1 ? "" : "s"}.`}
            </h3>
            <p className="mt-3 text-lg text-muted">Answer: {round.results.answerDisplay}</p>
          </div>

          <ResultNumberLine
            actualValue={round.results.answerNumeric}
            answerDisplay={round.results.answerDisplay}
            results={round.results.revealedGuesses}
          />

          <div className="glass-card rounded-[2rem] p-5">
            <h3 className="font-serif text-2xl text-foreground">Result list</h3>
            <div className="mt-4 space-y-3">
              {round.results.revealedGuesses.map((result) => (
                <div
                  key={result.playerId}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                    result.isWinner
                      ? "border-winner/30 bg-winner/10"
                      : result.isBust
                        ? "border-bust/30 bg-bust/10"
                        : "border-line bg-white/60"
                  }`}
                >
                  <div>
                    <p className="text-lg font-semibold text-foreground">{result.displayName}</p>
                    <p className="text-sm text-muted">Guess: {result.guessDisplay}</p>
                  </div>
                  <StatusPill
                    label={result.status}
                    tone={result.isWinner ? "winner" : result.isBust ? "bust" : "cool"}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function HostRoomScreen({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const roomQuery = useHostRoomState(slug);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [roundSeconds, setRoundSeconds] = useState<number | null>(null);
  const defaultPack = roomQuery.data?.room.defaultPack ?? "mixed";
  const defaultRoundSeconds = roomQuery.data?.room.defaultRoundSeconds ?? 25;
  const activePack = selectedPack ?? defaultPack;
  const activeRoundSeconds = roundSeconds ?? defaultRoundSeconds;

  const startMutation = useMutation({
    mutationFn: () =>
      requestJson(`/api/cwogo/rooms/${slug}/host/start`, {
        method: "POST",
        body: JSON.stringify({
          pack: activePack,
          roundSeconds: activeRoundSeconds,
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cwogo", "host-room", slug] });
    },
  });

  const lockMutation = useMutation({
    mutationFn: () =>
      requestJson(`/api/cwogo/rooms/${slug}/host/lock`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cwogo", "host-room", slug] });
    },
  });

  const revealMutation = useMutation({
    mutationFn: () =>
      requestJson(`/api/cwogo/rooms/${slug}/host/reveal`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cwogo", "host-room", slug] });
    },
  });

  const activeError =
    (startMutation.isError && startMutation.error.message) ||
    (lockMutation.isError && lockMutation.error.message) ||
    (revealMutation.isError && revealMutation.error.message) ||
    null;

  if (roomQuery.isPending) {
    return <div className="rounded-[2rem] border border-line bg-white/70 p-8 text-lg text-muted">Loading room…</div>;
  }

  if (roomQuery.isError) {
    return (
      <div className="rounded-[2rem] border border-bust/30 bg-bust/10 p-8 text-lg text-bust">
        {roomQuery.error.message}
      </div>
    );
  }

  const data = roomQuery.data;

  if (data.role !== "host") {
    return (
      <div className="rounded-[2rem] border border-bust/30 bg-bust/10 p-8 text-lg text-bust">
        Host access is required for this screen.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="grid gap-6">
        <section className="glass-card rounded-[2.25rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted">Host console</p>
              <h1 className="mt-3 font-serif text-4xl text-foreground sm:text-5xl">{data.room.title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Keep this screen on the shared display. Players join from their own devices and only see their own
                guesses until reveal.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-accent/20 bg-white/70 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Join code</p>
              <p className="mt-2 text-4xl font-semibold tracking-[0.16em] text-foreground">{data.room.joinCode}</p>
            </div>
          </div>
        </section>

        <HostRoundBody
          data={data}
          selectedPack={activePack}
          setSelectedPack={setSelectedPack}
          roundSeconds={activeRoundSeconds}
          setRoundSeconds={setRoundSeconds}
          onStart={() => startMutation.mutate()}
          onLock={() => lockMutation.mutate()}
          onReveal={() => revealMutation.mutate()}
          startPending={startMutation.isPending}
          lockPending={lockMutation.isPending}
          revealPending={revealMutation.isPending}
        />

        {activeError ? (
          <p className="rounded-[1.75rem] border border-bust/30 bg-bust/10 px-4 py-3 text-sm text-bust">{activeError}</p>
        ) : null}
      </div>

      <aside className="grid gap-6 self-start">
        <QrJoinCard joinCode={data.room.joinCode} joinPath={data.room.joinPath} />
        <Scoreboard entries={data.scoreboard} />
        <section className="glass-card rounded-[2rem] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Player screen</p>
          <Link
            href={`/cwogo/join/${data.room.joinCode}`}
            className="mt-3 inline-flex rounded-full border border-foreground/10 bg-white/70 px-4 py-3 font-semibold text-foreground hover:border-accent hover:text-accent-deep"
          >
            Open join page
          </Link>
        </section>
      </aside>
    </div>
  );
}
