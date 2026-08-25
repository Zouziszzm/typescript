"use client";

type LivesDisplayProps = {
  lives: number;
  maxLives?: number;
  isLifeWord?: boolean;
  wordTimeLeftMs?: number | null;
};

export function LivesDisplay({
  lives,
  maxLives = 3,
  isLifeWord,
  wordTimeLeftMs,
}: LivesDisplayProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1" aria-label={`${lives} lives`}>
        {Array.from({ length: maxLives }, (_, i) => (
          <Heart key={i} filled={i < lives} />
        ))}
      </div>
      {isLifeWord && wordTimeLeftMs != null && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            wordTimeLeftMs <= 150
              ? "animate-pulse bg-rose-500/20 text-rose-300"
              : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          Life word · {(wordTimeLeftMs / 1000).toFixed(2)}s
        </span>
      )}
    </div>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      className={filled ? "text-rose-500" : "text-zinc-700"}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
