"use client";

import { useEffect, useState } from "react";
import { LabeledSelect } from "@/components/LabeledSelect";

type Entry = {
  id: string;
  mode: string;
  modeValue: number | null;
  teamWpm: number;
  teamAccuracy: number;
  playerCount: number;
  createdAt: string;
  players: Array<{
    userId: string;
    name: string | null;
    seat: number;
    wpm: number;
    accuracy: number;
  }>;
};

const MODE_OPTIONS = [
  { value: "words", label: "Words" },
  { value: "time", label: "Time" },
  { value: "quote", label: "Quote" },
  { value: "custom", label: "Custom" },
];

const TIME_VALUE_OPTIONS = [
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "60", label: "60s" },
  { value: "120", label: "120s" },
];

const WORD_VALUE_OPTIONS = [
  { value: "25", label: "25 words" },
  { value: "50", label: "50 words" },
  { value: "100", label: "100 words" },
];

const PLAYER_COUNT_OPTIONS = [
  { value: "", label: "All team sizes" },
  { value: "2", label: "2 players" },
  { value: "3", label: "3 players" },
];

export default function LeaderboardPage() {
  const [mode, setMode] = useState("words");
  const [modeValue, setModeValue] = useState("25");
  const [playerCount, setPlayerCount] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ mode });
    if (mode === "words" || mode === "time") {
      params.set("modeValue", modeValue);
    }
    if (playerCount) params.set("playerCount", playerCount);

    setLoading(true);
    fetch(`/api/leaderboard?${params}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, [mode, modeValue, playerCount]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-sm text-zinc-400">
          Top team scores by mode. Competitive rankings for 2–3 player matches.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <LabeledSelect
          value={mode}
          onValueChange={(value) => {
            setMode(value);
            setModeValue(value === "time" ? "60" : "25");
          }}
          options={MODE_OPTIONS}
          triggerClassName="min-w-[120px]"
        />

        {(mode === "words" || mode === "time") && (
          <LabeledSelect
            value={modeValue}
            onValueChange={setModeValue}
            options={mode === "time" ? TIME_VALUE_OPTIONS : WORD_VALUE_OPTIONS}
            triggerClassName="min-w-[120px]"
          />
        )}

        <LabeledSelect
          value={playerCount}
          onValueChange={setPlayerCount}
          options={PLAYER_COUNT_OPTIONS}
          triggerClassName="min-w-[140px]"
        />
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-zinc-500">No scores yet. Be the first warriors.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">WPM</th>
                <th className="px-4 py-3">Accuracy</th>
                <th className="px-4 py-3">Players</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} className="border-b border-zinc-900">
                  <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    {e.players.map((p) => p.name ?? "Anon").join(" + ")}
                  </td>
                  <td className="px-4 py-3 font-medium text-amber-300">
                    {Math.round(e.teamWpm)}
                  </td>
                  <td className="px-4 py-3">{Math.round(e.teamAccuracy)}%</td>
                  <td className="px-4 py-3">{e.playerCount}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
