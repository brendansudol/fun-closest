import type { ScoreboardEntry } from "@/types/game";

export function Scoreboard({
  entries,
  title = "Scoreboard",
}: {
  entries: ScoreboardEntry[];
  title?: string;
}) {
  return (
    <section className="glass-card rounded-[2rem] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-2xl text-foreground">{title}</h3>
        <span className="text-sm uppercase tracking-[0.22em] text-muted">Cumulative</span>
      </div>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.playerId}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
              entry.isMe
                ? "border-accent bg-[rgba(239,109,68,0.12)]"
                : "border-line bg-[rgba(255,255,255,0.55)]"
            }`}
          >
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">#{index + 1}</p>
              <p className="text-lg font-semibold text-foreground">{entry.displayName}</p>
            </div>
            <p className="text-2xl font-semibold text-foreground">{entry.scoreTotal}</p>
          </div>
        ))}

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            Players appear here once they join.
          </div>
        ) : null}
      </div>
    </section>
  );
}
