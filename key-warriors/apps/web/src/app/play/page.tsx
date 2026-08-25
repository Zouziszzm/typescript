"use client";

import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  TIME_OPTIONS,
  WORD_OPTIONS,
  PLAYER_COUNT_OPTIONS,
  generateRoomCode,
  type GameMode,
  type PlayerCount,
} from "@key-warriors/shared";
import { LabeledSelect } from "@/components/LabeledSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MODE_OPTIONS = [
  { value: "words", label: "Words" },
  { value: "time", label: "Time" },
  { value: "quote", label: "Quote" },
  { value: "custom", label: "Custom (set in lobby)" },
];

export default function PlayPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<GameMode>("words");
  const [modeValue, setModeValue] = useState<number>(25);
  const [maxPlayers, setMaxPlayers] = useState<PlayerCount>(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return <p className="text-zinc-400">Loading…</p>;
  }

  const createRoom = async () => {
    setBusy(true);
    setError(null);
    try {
      if (session?.user) {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            modeValue: mode === "quote" || mode === "custom" ? null : modeValue,
            maxPlayers,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create room");
        router.push(
          `/room/${data.code}?maxPlayers=${data.maxPlayers ?? maxPlayers}&create=1`
        );
        return;
      }

      const code = generateRoomCode();
      const params = new URLSearchParams({
        mode,
        modeValue: String(mode === "quote" || mode === "custom" ? "" : modeValue),
        maxPlayers: String(maxPlayers),
        create: "1",
      });
      router.push(`/room/${code}?${params.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError("Enter a 6-character room code");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      router.push(`/room/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {!session?.user && (
        <p className="text-sm text-zinc-500 md:col-span-2">
          Playing as a guest — rooms are live only and nothing is saved.{" "}
          <Link href="/auth/sign-in" className="text-amber-400 hover:underline">
            Sign in
          </Link>{" "}
          to keep match history.
        </p>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm">
        <h1 className="text-xl font-bold text-zinc-50">Create room</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Host a lobby for 2–3 players.
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <LabeledSelect
            label="Players"
            value={String(maxPlayers)}
            onValueChange={(value) =>
              setMaxPlayers(Number(value) as PlayerCount)
            }
            options={PLAYER_COUNT_OPTIONS.map((n) => ({
              value: String(n),
              label: `${n} players`,
            }))}
          />

          <LabeledSelect
            label="Mode"
            value={mode}
            onValueChange={(value) => {
              const m = value as GameMode;
              setMode(m);
              setModeValue(m === "time" ? 60 : 25);
            }}
            options={MODE_OPTIONS}
          />

          {mode === "time" && (
            <LabeledSelect
              label="Seconds"
              value={String(modeValue)}
              onValueChange={(value) => setModeValue(Number(value))}
              options={TIME_OPTIONS.map((t) => ({
                value: String(t),
                label: `${t}s`,
              }))}
            />
          )}

          {mode === "words" && (
            <LabeledSelect
              label="Word count"
              value={String(modeValue)}
              onValueChange={(value) => setModeValue(Number(value))}
              options={WORD_OPTIONS.map((w) => ({
                value: String(w),
                label: String(w),
              }))}
            />
          )}

          <Button type="button" disabled={busy} onClick={createRoom}>
            Create
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-zinc-50">Join room</h2>
        <p className="mt-1 text-sm text-zinc-400">Enter a 6-character code.</p>
        <div className="mt-4 flex gap-2">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="flex-1 font-mono tracking-widest uppercase"
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={joinRoom}
          >
            Join
          </Button>
        </div>
      </section>

      {error && <p className="text-sm text-rose-400 md:col-span-2">{error}</p>}
    </div>
  );
}
