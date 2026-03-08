import type { RevealedGuess } from "@/types/cwogo";

function lanePosition(index: number, bust: boolean) {
  if (bust) {
    return 164 + (index % 2) * 20;
  }

  return 108 - (index % 2) * 20;
}

export function ResultNumberLine({
  actualValue,
  answerDisplay,
  results,
}: {
  actualValue: number;
  answerDisplay: string;
  results: RevealedGuess[];
}) {
  const maxGuess = results.reduce((highest, result) => Math.max(highest, result.guessNumeric), actualValue);
  const maxValue = Math.max(1, Math.ceil(maxGuess * 1.1));
  const underResults = results.filter((result) => !result.isBust);
  const bustResults = results.filter((result) => result.isBust);
  const lanes = new Map<string, number>();

  underResults.forEach((result, index) => {
    lanes.set(result.playerId, lanePosition(index, false));
  });

  bustResults.forEach((result, index) => {
    lanes.set(result.playerId, lanePosition(index, true));
  });

  const position = (value: number) => 60 + (value / maxValue) * 880;
  const actualX = position(actualValue);

  return (
    <div className="glass-card rounded-[2rem] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Reveal chart</p>
          <h3 className="font-serif text-2xl text-foreground">Where every guess landed</h3>
        </div>
        <div className="rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent-deep">
          Actual answer: {answerDisplay}
        </div>
      </div>

      <svg viewBox="0 0 1000 220" className="w-full overflow-visible">
        <line x1="60" x2="940" y1="140" y2="140" stroke="rgba(31,25,49,0.25)" strokeWidth="3" />
        <line x1={actualX} x2={actualX} y1="32" y2="194" stroke="var(--accent-cool)" strokeWidth="4" strokeDasharray="8 8" />
        <text x={actualX} y="24" textAnchor="middle" className="fill-[var(--accent-cool)] text-[12px] font-semibold uppercase tracking-[0.18em]">
          Answer
        </text>

        <text x="60" y="196" className="fill-[var(--muted)] text-[12px] font-medium">
          0
        </text>
        <text x="940" y="196" textAnchor="end" className="fill-[var(--muted)] text-[12px] font-medium">
          {maxValue.toLocaleString()}
        </text>

        {results.map((result) => {
          const x = position(result.guessNumeric);
          const y = lanes.get(result.playerId) ?? 140;
          const fill = result.isWinner ? "var(--winner)" : result.isBust ? "white" : "var(--accent)";
          const stroke = result.isBust ? "var(--bust)" : result.isWinner ? "var(--winner)" : "rgba(31,25,49,0.12)";

          return (
            <g key={result.playerId}>
              <title>{`${result.displayName}: ${result.guessDisplay}`}</title>
              <line x1={x} x2={x} y1="140" y2={y} stroke={stroke} strokeWidth="2" opacity="0.5" />
              <circle cx={x} cy={y} r={result.isWinner ? 12 : 9} fill={fill} stroke={stroke} strokeWidth="4" />
              <text x={x} y={result.isBust ? y + 26 : y - 18} textAnchor="middle" className="fill-[var(--foreground)] text-[11px] font-semibold">
                {result.displayName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
