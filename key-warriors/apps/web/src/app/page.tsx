import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-6 pt-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400/90">
          Collaborative typing
        </p>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
          Two minds. One paragraph.{" "}
          <span className="text-amber-400">Shared glory.</span>
        </h1>
        <p className="max-w-xl text-lg text-zinc-400">
          Keyboard Warriors is a turn-based multiplayer typing game. You type a
          word, your partner types the next — Monkeytype energy, co-op scoring.
          2–3 players per room. Try{" "}
          <strong className="text-rose-300">Hardcore mode</strong> with locked
          mistakes and a lives system.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/play"
            className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-zinc-950 hover:bg-amber-400"
          >
            Play now
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-zinc-200 hover:border-zinc-500"
          >
            Leaderboard
          </Link>
          <Link
            href="/practice"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-zinc-200 hover:border-zinc-500"
          >
            Solo practice
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Turn-based words",
            body: "Round-robin seats. Watch teammates keystroke live when it is not your turn.",
          },
          {
            title: "Hardcore + lives",
            body: "Mistakes lock in with no backspace. Life words restore hearts when typed perfectly in time.",
          },
          {
            title: "Monkeytype-style modes",
            body: "Time, words, quotes, or custom text — pick your challenge in the lobby.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-sm"
          >
            <h2 className="font-semibold text-zinc-100">{card.title}</h2>
            <p className="mt-2 text-sm text-zinc-400">{card.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
