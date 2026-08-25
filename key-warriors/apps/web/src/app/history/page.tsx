"use client";

import { authClient } from "@/lib/auth/client";
import Link from "next/link";
import { useEffect, useState } from "react";

type MatchRow = {
  matchId: string;
  mode: string;
  modeValue: number | null;
  teamWpm: number;
  teamAccuracy: number;
  durationMs: number;
  createdAt: string;
  myStats: {
    seat: number;
    wpm: number;
    accuracy: number;
    correctChars: number;
    incorrectChars: number;
    completedWords: number;
  };
  players: Array<{
    userId: string;
    name: string | null;
    seat: number;
    wpm: number;
    accuracy: number;
  }>;
};

export default function HistoryPage() {
  const { data: session, isPending } = authClient.useSession();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setLoading(false);
      return;
    }
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []))
      .finally(() => setLoading(false));
  }, [session, isPending]);

  if (isPending || loading) {
    return <p className="text-zinc-400">Loading…</p>;
  }

  if (!session) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Match history</h1>
        <p className="text-zinc-400">Sign in to see your past matches.</p>
        <Link href="/auth/sign-in" className="text-amber-400 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Match history</h1>
        <p className="text-sm text-zinc-400">Your recent collaborative games.</p>
      </div>

      {matches.length === 0 ? (
        <p className="text-zinc-500">No matches yet. Create a room and play.</p>
      ) : (
        <ul className="space-y-3">
          {matches.map((m) => (
            <li
              key={m.matchId}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-zinc-100">
                  {m.mode}
                  {m.modeValue != null ? ` / ${m.modeValue}` : ""} · Team{" "}
                  {Math.round(m.teamWpm)} WPM · {Math.round(m.teamAccuracy)}%
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 text-sm text-zinc-400">
                You: seat {m.myStats.seat + 1} · {Math.round(m.myStats.wpm)} WPM
                · {Math.round(m.myStats.accuracy)}% · {m.myStats.completedWords}{" "}
                words
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                With: {m.players.map((p) => p.name ?? "Anon").join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
