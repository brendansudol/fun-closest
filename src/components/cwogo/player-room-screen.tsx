"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ResultNumberLine } from "./result-number-line";
import { Scoreboard } from "./scoreboard";
import { formatCountdownLabel, formatPackLabel } from "@/lib/cwogo/format";
import { usePlayerRoomState } from "@/hooks/use-player-room-state";
import { useRoomCountdown } from "@/hooks/use-room-countdown";
import { useSubmitGuess } from "@/hooks/use-submit-guess";

function StatusBanner({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[1.75rem] border border-line bg-white/60 px-5 py-4 text-sm leading-7 text-muted">{children}</div>;
}

export function PlayerRoomScreen({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const roomQuery = usePlayerRoomState(slug);
  const [draftGuessesByRound, setDraftGuessesByRound] = useState<Record<string, string>>({});
  const roomData = roomQuery.data;
  const roundId = roomData?.currentRound?.id ?? "";
  const submitGuessMutation = useSubmitGuess(roundId, slug);
  const secondsRemaining = useRoomCountdown(roomData?.currentRound?.locksAt, roomData?.currentRound?.serverNow);

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

  if (!roomData || roomData.role !== "player") {
    return (
      <div className="rounded-[2rem] border border-bust/30 bg-bust/10 p-8 text-lg text-bust">
        Join the room before using the player screen.
      </div>
    );
  }

  const round = roomData.currentRound;
  const draftGuess = round ? draftGuessesByRound[round.id] ?? roomData.myGuess?.guessRaw ?? "" : "";

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <section className="glass-card rounded-[2.25rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted">Player view</p>
            <h1 className="mt-3 font-serif text-4xl text-foreground sm:text-5xl">{roomData.room.title}</h1>
            <p className="mt-4 text-lg leading-8 text-muted">
              You&apos;re in as <span className="font-semibold text-foreground">{roomData.me.displayName}</span>.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-accent/20 bg-white/70 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Join code</p>
            <p className="mt-2 text-3xl font-semibold tracking-[0.16em] text-foreground">{roomData.room.joinCode}</p>
          </div>
        </div>
      </section>

      {!round ? (
        <section className="glass-card rounded-[2.25rem] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Lobby</p>
          <h2 className="mt-3 font-serif text-4xl text-foreground">Waiting for the host.</h2>
          <p className="mt-4 text-lg leading-8 text-muted">
            Hang tight. The next prompt will appear here as soon as the round starts.
          </p>
          <StatusBanner>
            Your score carries between rounds. Refreshing is fine because the server keeps your room session.
          </StatusBanner>
        </section>
      ) : null}

      {round ? (
        <section className="glass-card rounded-[2.25rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-accent-cool/30 bg-accent-cool/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent-cool">
                  Round {round.roundNumber}
                </span>
                <span className="rounded-full border border-foreground/10 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                  {formatPackLabel(round.pack)}
                </span>
              </div>
              <h2 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">{round.promptText}</h2>
              <p className="mt-4 text-lg leading-8 text-muted">
                Units: {round.promptUnitLabel}
                {round.hintText ? ` · ${round.hintText}` : ""}
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-accent/20 bg-white/70 px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Timer</p>
              <p className="mt-1 text-4xl font-semibold text-foreground">
                {round.phase === "open" ? formatCountdownLabel(secondsRemaining ?? 0) : "--:--"}
              </p>
            </div>
          </div>

          {round.phase === "open" ? (
            <form
              className="mt-8 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitGuessMutation.mutate(draftGuess, {
                  onSuccess: async () => {
                    await queryClient.invalidateQueries({ queryKey: ["cwogo", "player-room", slug] });
                  },
                });
              }}
            >
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">Your guess</span>
                <input
                  value={draftGuess}
                  onChange={(event) => {
                    if (!round) {
                      return;
                    }

                    setDraftGuessesByRound((current) => ({
                      ...current,
                      [round.id]: event.target.value,
                    }));
                  }}
                  inputMode="decimal"
                  placeholder="1.2m"
                  className="rounded-[1.75rem] border border-line bg-white px-5 py-4 text-3xl font-semibold outline-none focus:border-accent"
                />
              </label>

              <button
                type="submit"
                disabled={submitGuessMutation.isPending}
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-accent px-6 text-lg font-semibold text-white shadow-[0_16px_30px_rgba(239,109,68,0.32)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitGuessMutation.isPending
                  ? "Submitting..."
                  : roomData.myGuess
                    ? "Update guess"
                    : "Submit guess"}
              </button>

              {submitGuessMutation.isError ? (
                <p className="rounded-2xl border border-bust/30 bg-bust/10 px-4 py-3 text-sm text-bust">
                  {submitGuessMutation.error.message}
                </p>
              ) : null}

              {roomData.myGuess ? (
                <StatusBanner>
                  Current saved guess: <span className="font-semibold text-foreground">{roomData.myGuess.displayGuess}</span>
                </StatusBanner>
              ) : (
                <StatusBanner>Guesses stay hidden until the host reveals the round.</StatusBanner>
              )}
            </form>
          ) : null}

          {round.phase === "locked" ? (
            <div className="mt-8 grid gap-4">
              <StatusBanner>
                Locked. Waiting for reveal.
                {roomData.myGuess ? (
                  <>
                    {" "}
                    Your submitted guess is{" "}
                    <span className="font-semibold text-foreground">{roomData.myGuess.displayGuess}</span>.
                  </>
                ) : (
                  " You did not submit a guess in time."
                )}
              </StatusBanner>
            </div>
          ) : null}

          {round.phase === "revealed" && round.results ? (
            <div className="mt-8 grid gap-6">
              <div className="rounded-[1.75rem] border border-line bg-white/55 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Result</p>
                <h3 className="mt-2 font-serif text-3xl text-foreground">
                  {round.results.revealedGuesses.length === 0
                    ? "No submissions this round."
                    : round.results.noWinner
                      ? "Everybody went over."
                      : `${round.results.revealedGuesses
                          .filter((guess) => guess.isWinner)
                          .map((guess) => guess.displayName)
                          .join(", ")} take${round.results.winnerPlayerIds.length > 1 ? "" : "s"} the point.`}
                </h3>
                <p className="mt-3 text-lg text-muted">Actual answer: {round.results.answerDisplay}</p>
              </div>

              <ResultNumberLine
                actualValue={round.results.answerNumeric}
                answerDisplay={round.results.answerDisplay}
                results={round.results.revealedGuesses}
              />

              <div className="glass-card rounded-[2rem] p-5">
                <h3 className="font-serif text-2xl text-foreground">Results</h3>
                <div className="mt-4 space-y-3">
                  {round.results.revealedGuesses.map((result) => (
                    <div
                      key={result.playerId}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                        result.isMe
                          ? "border-accent bg-[rgba(239,109,68,0.12)]"
                          : result.isWinner
                            ? "border-winner/30 bg-winner/10"
                            : result.isBust
                              ? "border-bust/30 bg-bust/10"
                              : "border-line bg-white/60"
                      }`}
                    >
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          {result.displayName}
                          {result.isMe ? " (you)" : ""}
                        </p>
                        <p className="text-sm text-muted">Guess: {result.guessDisplay}</p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          result.isWinner
                            ? "border-winner/30 bg-winner/10 text-winner"
                            : result.isBust
                              ? "border-bust/30 bg-bust/10 text-bust"
                              : "border-accent-cool/30 bg-accent-cool/10 text-accent-cool"
                        }`}
                      >
                        {result.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <Scoreboard entries={roomData.scoreboard} />

      <section className="glass-card rounded-[2rem] p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Need to rejoin?</p>
        <Link
          href={`/cwogo/join/${roomData.room.joinCode}`}
          className="mt-3 inline-flex rounded-full border border-foreground/10 bg-white/70 px-4 py-3 font-semibold text-foreground hover:border-accent hover:text-accent-deep"
        >
          Back to join screen
        </Link>
      </section>
    </div>
  );
}
