"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  isLifeWord,
  lifeWordTimeLimitMs,
  MAX_LIVES,
  PLAYER_COUNT_OPTIONS,
  TIME_OPTIONS,
  WORD_OPTIONS,
  type GameMode,
  type GameSettings,
  type PlayerCount,
  type RoomState,
  type TypingMode,
} from "@key-warriors/shared";
import { LivesDisplay } from "@/components/LivesDisplay";
import { WordDisplay } from "@/components/WordDisplay";
import { LabeledSelect } from "@/components/LabeledSelect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGameSocket } from "@/hooks/useGameSocket";

type RoomGameProps = {
  code: string;
  userId: string;
  name: string;
  image?: string | null;
  initialMode?: GameMode;
  initialModeValue?: number | null;
  initialMaxPlayers?: PlayerCount;
  isCreator?: boolean;
};

export function RoomGame({
  code,
  userId,
  name,
  image,
  initialMode = "words",
  initialModeValue = 25,
  initialMaxPlayers = 3,
  isCreator = false,
}: RoomGameProps) {
  const { room, connected, joined, error, result, wordResults, send, setReady } =
    useGameSocket({
      userId,
      name,
      image,
      code,
      initialMode,
      initialModeValue,
      initialMaxPlayers,
      isCreator,
    });
  const [input, setInput] = useState("");
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [wordTimeLeft, setWordTimeLeft] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const me = room?.players.find((p) => p.userId === userId);
  const isHost = room?.hostId === userId;
  const hardcore = room?.settings.typingMode === "hardcore";
  const lifeWordIndices = room?.lifeWordIndices ?? [];
  const lives = room?.lives ?? 0;
  const showLives = room?.settings.livesEnabled && lives > 0;

  const isMyTurn =
    room?.status === "playing" && me != null && room.turnSeat === me.seat;

  const currentWord = room?.words[room.currentWordIndex ?? 0] ?? "";
  const isCurrentLifeWord =
    room != null && isLifeWord(room.currentWordIndex, lifeWordIndices);

  useEffect(() => {
    if (!room?.countdownEndsAt || room.status !== "countdown") {
      setCountdownLeft(null);
      return;
    }
    const tick = () => {
      setCountdownLeft(
        Math.max(0, Math.ceil((room.countdownEndsAt! - Date.now()) / 1000))
      );
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [room?.countdownEndsAt, room?.status]);

  useEffect(() => {
    setInput("");
  }, [room?.currentWordIndex, room?.turnSeat]);

  useEffect(() => {
    if (isMyTurn) inputRef.current?.focus();
  }, [isMyTurn]);

  // Life-word countdown timer
  useEffect(() => {
    if (
      !isMyTurn ||
      !hardcore ||
      !room?.settings.livesEnabled ||
      !isCurrentLifeWord ||
      !room.wordStartedAt
    ) {
      setWordTimeLeft(null);
      return;
    }
    const limit = lifeWordTimeLimitMs(currentWord);
    const tick = () => {
      const elapsed = Date.now() - (room.wordStartedAt ?? Date.now());
      setWordTimeLeft(Math.max(0, limit - elapsed));
    };
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [
    isMyTurn,
    hardcore,
    room?.settings.livesEnabled,
    isCurrentLifeWord,
    room?.wordStartedAt,
    room?.currentWordIndex,
    currentWord,
  ]);

  const activePlayer = useMemo(() => {
    if (!room) return null;
    return room.players.find((p) => p.seat === room.turnSeat) ?? null;
  }, [room]);

  const onInput = (value: string) => {
    if (!room || !isMyTurn) return;

    if (hardcore) {
      if (value.length < input.length) return;
      if (value.endsWith(" ")) return;
      const capped = value.slice(0, currentWord.length);
      setInput(capped);
      send({
        type: "keystroke",
        input: capped,
        wordIndex: room.currentWordIndex,
      });
      return;
    }

    if (value.endsWith(" ")) {
      send({
        type: "word_complete",
        wordIndex: room.currentWordIndex,
        input: value.slice(0, -1),
      });
      setInput("");
      return;
    }
    setInput(value);
    send({
      type: "keystroke",
      input: value,
      wordIndex: room.currentWordIndex,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hardcore) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
    }
  };

  const displayInput = isMyTurn ? input : (room?.activeInput ?? "");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">Room code</p>
          <p className="font-mono text-2xl tracking-widest text-amber-400">
            {code}
          </p>
        </div>
        <div className="text-sm text-zinc-400">
          {!connected ? (
            <span className="text-rose-400">Disconnected</span>
          ) : !joined ? (
            <span className="text-amber-400">Connecting to lobby…</span>
          ) : (
            <span className="text-emerald-400">In lobby</span>
          )}
          {error && <p className="mt-1 text-rose-400">{error}</p>}
        </div>
      </div>

      {!room && (
        <p className="text-zinc-400">
          {connected
            ? isCreator
              ? "Creating lobby…"
              : "Joining room…"
            : "Connecting…"}
        </p>
      )}

      {room && room.status === "lobby" && (
        <Lobby
          room={room}
          isHost={!!isHost}
          meReady={!!me?.ready}
          initialMode={initialMode}
          initialModeValue={initialModeValue}
          initialMaxPlayers={initialMaxPlayers}
          onReady={setReady}
          onSettings={(settings) => send({ type: "update_settings", settings })}
          onStart={() => send({ type: "host_start" })}
        />
      )}

      {room && room.status === "countdown" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center backdrop-blur-sm">
          <p className="text-sm uppercase tracking-widest text-zinc-500">
            Starting in
          </p>
          <p className="mt-2 text-6xl font-bold text-amber-400">
            {countdownLeft ?? "…"}
          </p>
        </div>
      )}

      {room && (room.status === "playing" || room.status === "finished") && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
              <span>
                Turn:{" "}
                <strong className="text-zinc-100">
                  {activePlayer?.name ?? "—"}
                  {isMyTurn ? " (you)" : ""}
                </strong>
              </span>
              <span>
                Word {Math.min(room.currentWordIndex + 1, room.words.length)}/
                {room.words.length}
              </span>
              {hardcore && (
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-300">
                  Hardcore
                </span>
              )}
              {room.players.map((p) => (
                <span key={p.userId}>
                  {p.name}: {p.correctChars}c / {p.incorrectChars}e
                </span>
              ))}
            </div>
            {showLives && (
              <LivesDisplay
                lives={lives}
                maxLives={MAX_LIVES}
                isLifeWord={isCurrentLifeWord && isMyTurn}
                wordTimeLeftMs={wordTimeLeft}
              />
            )}
          </div>

          {hardcore && isMyTurn && (
            <p className="text-xs text-zinc-500">
              Mistakes are locked in — no backspace. Type the rest of the word
              correctly. Perfect words let you chain the next one.
            </p>
          )}

          <button
            type="button"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-left backdrop-blur-sm"
            onClick={() => inputRef.current?.focus()}
          >
            <WordDisplay
              words={room.words}
              currentWordIndex={room.currentWordIndex}
              activeInput={displayInput}
              completedCorrect={wordResults}
              isActiveTurn={room.status === "playing"}
              hardcore={hardcore}
              lifeWordIndices={lifeWordIndices}
            />
          </button>

          <input
            ref={inputRef}
            value={input}
            disabled={!isMyTurn || room.status !== "playing"}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="sr-only"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Multiplayer typing input"
          />

          {!isMyTurn && room.status === "playing" && (
            <p className="text-center text-sm text-zinc-500">
              Watching {activePlayer?.name ?? "partner"} type…
            </p>
          )}
        </div>
      )}

      {(result || room?.status === "finished") && (
        <ResultsPanel room={room} result={result} />
      )}
    </div>
  );
}

function Lobby({
  room,
  isHost,
  meReady,
  initialMode,
  initialModeValue,
  initialMaxPlayers,
  onReady,
  onSettings,
  onStart,
}: {
  room: RoomState;
  isHost: boolean;
  meReady: boolean;
  initialMode: GameMode;
  initialModeValue: number | null;
  initialMaxPlayers: PlayerCount;
  onReady: (ready: boolean) => void;
  onSettings: (settings: GameSettings) => void;
  onStart: () => void;
}) {
  const [mode, setMode] = useState<GameMode>(
    room.settings.mode ?? initialMode
  );
  const [modeValue, setModeValue] = useState<number | null>(
    room.settings.modeValue ?? initialModeValue
  );
  const [customText, setCustomText] = useState("");
  const [typingMode, setTypingMode] = useState<TypingMode>(
    room.settings.typingMode ?? "standard"
  );
  const [livesEnabled, setLivesEnabled] = useState(
    room.settings.livesEnabled ?? false
  );
  const [maxPlayers, setMaxPlayers] = useState<PlayerCount>(
    room.settings.maxPlayers ?? initialMaxPlayers
  );

  const playerCap = room.settings.maxPlayers ?? 3;
  const connectedPlayers = room.players.filter((p) => p.connected);
  const canStart =
    connectedPlayers.length >= 2 &&
    (playerCap !== 2 || connectedPlayers.length === 2) &&
    connectedPlayers.every((p) => p.ready);

  const settingsMatch = (
    a: GameSettings,
    b: GameSettings
  ): boolean =>
    a.mode === b.mode &&
    a.modeValue === b.modeValue &&
    (a.typingMode ?? "standard") === (b.typingMode ?? "standard") &&
    (a.livesEnabled ?? false) === (b.livesEnabled ?? false) &&
    (a.maxPlayers ?? 3) === (b.maxPlayers ?? 3) &&
    (a.customText ?? null) === (b.customText ?? null);

  const buildSettings = (overrides?: Partial<GameSettings>): GameSettings => ({
    mode,
    modeValue,
    customText: mode === "custom" ? customText : null,
    typingMode,
    livesEnabled,
    maxPlayers,
    ...overrides,
  });

  const applySettings = (overrides?: Partial<GameSettings>) => {
    if (!isHost) return;
    const next = buildSettings(overrides);
    if (settingsMatch(next, room.settings)) return;
    onSettings(next);
  };

  useEffect(() => {
    setMode(room.settings.mode);
    setModeValue(room.settings.modeValue);
    setTypingMode(room.settings.typingMode ?? "standard");
    setLivesEnabled(room.settings.livesEnabled ?? false);
    setMaxPlayers(room.settings.maxPlayers ?? initialMaxPlayers);
  }, [
    room.settings.mode,
    room.settings.modeValue,
    room.settings.typingMode,
    room.settings.livesEnabled,
    room.settings.maxPlayers,
    initialMaxPlayers,
  ]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-sm">
        <h2 className="mb-3 font-semibold text-zinc-100">Players</h2>
        <ul className="space-y-2">
          {room.players.map((p) => (
            <li
              key={p.userId}
              className="flex items-center justify-between rounded-lg bg-zinc-950/60 px-3 py-2 text-sm"
            >
              <span>
                Seat {p.seat + 1}: {p.name}
                {p.userId === room.hostId ? " (host)" : ""}
                {!p.connected && (
                  <span className="ml-2 text-rose-400">offline</span>
                )}
              </span>
              <span className={p.ready ? "text-emerald-400" : "text-zinc-500"}>
                {p.ready ? "Ready" : "Not ready"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          {connectedPlayers.length}/{playerCap} players online
          {playerCap === 2
            ? " (both must ready)"
            : " (min 2 online, all must ready)"}
        </p>
        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={() => onReady(!meReady)}>
            {meReady ? "Unready" : "Ready up"}
          </Button>
          {isHost && (
            <Button type="button" onClick={onStart} disabled={!canStart}>
              Start game
            </Button>
          )}
        </div>
        {isHost && !canStart && connectedPlayers.length >= 2 && (
          <p className="mt-2 text-xs text-zinc-500">
            Everyone online must click Ready up before you can start (including
            you).
          </p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-sm">
        <h2 className="mb-3 font-semibold text-zinc-100">Settings</h2>
        {!isHost ? (
          <div className="space-y-1 text-sm text-zinc-400">
            <p>
              Mode: {room.settings.mode}
              {room.settings.modeValue != null
                ? ` / ${room.settings.modeValue}`
                : ""}
            </p>
            <p>Typing: {room.settings.typingMode ?? "standard"}</p>
            <p>Lives: {room.settings.livesEnabled ? "on" : "off"}</p>
            <p>Players: {room.settings.maxPlayers ?? 3}</p>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <LabeledSelect
              label="Players"
              value={String(maxPlayers)}
              onValueChange={(value) => {
                const next = Number(value) as PlayerCount;
                setMaxPlayers(next);
                applySettings({ maxPlayers: next });
              }}
              options={PLAYER_COUNT_OPTIONS.map((n) => ({
                value: String(n),
                label: `${n} players`,
              }))}
            />
            <p className="text-xs text-zinc-500">
              Saves automatically. Room is full at {maxPlayers} players.
            </p>

            <LabeledSelect
              label="Typing mode"
              value={typingMode}
              onValueChange={(value) => {
                const t = value as TypingMode;
                const lives = t === "hardcore" ? true : livesEnabled;
                setTypingMode(t);
                if (t === "hardcore") setLivesEnabled(true);
                applySettings({ typingMode: t, livesEnabled: lives });
              }}
              options={[
                { value: "standard", label: "Standard (backspace allowed)" },
                {
                  value: "hardcore",
                  label: "Hardcore (locked mistakes + life words)",
                },
              ]}
            />

            <div className="flex items-center gap-2">
              <Checkbox
                id="lobby-lives"
                checked={livesEnabled}
                onCheckedChange={(checked) => {
                  const next = checked === true;
                  setLivesEnabled(next);
                  applySettings({ livesEnabled: next });
                }}
              />
              <Label htmlFor="lobby-lives" className="text-zinc-300">
                Lives system (3 hearts, life words restore)
              </Label>
            </div>

            <LabeledSelect
              label="Content mode"
              value={mode}
              onValueChange={(value) => {
                const m = value as GameMode;
                const mv = m === "time" ? 60 : m === "words" ? 25 : null;
                setMode(m);
                setModeValue(mv);
                applySettings({ mode: m, modeValue: mv });
              }}
              options={[
                { value: "words", label: "Words" },
                { value: "time", label: "Time" },
                { value: "quote", label: "Quote" },
                { value: "custom", label: "Custom" },
              ]}
            />

            {mode === "time" && (
              <LabeledSelect
                label="Seconds"
                value={String(modeValue ?? 60)}
                onValueChange={(value) => {
                  const next = Number(value);
                  setModeValue(next);
                  applySettings({ modeValue: next });
                }}
                options={TIME_OPTIONS.map((t) => ({
                  value: String(t),
                  label: `${t}s`,
                }))}
              />
            )}

            {mode === "words" && (
              <LabeledSelect
                label="Word count"
                value={String(modeValue ?? 25)}
                onValueChange={(value) => {
                  const next = Number(value);
                  setModeValue(next);
                  applySettings({ modeValue: next });
                }}
                options={WORD_OPTIONS.map((w) => ({
                  value: String(w),
                  label: String(w),
                }))}
              />
            )}

            {mode === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor="lobby-custom-text">Custom text</Label>
                <Textarea
                  id="lobby-custom-text"
                  rows={4}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                />
              </div>
            )}

            {typingMode === "hardcore" && (
              <p className="text-xs text-zinc-500">
                Hardcore: wrong keys stay visible. Finish the word to pass (or
                chain on a perfect word). Life words (♥) typed perfectly within
                125ms/char restore a heart.
              </p>
            )}

            {mode === "custom" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => applySettings()}
              >
                Apply custom text
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsPanel({
  room,
  result,
}: {
  room: RoomState | null;
  result: {
    teamWpm: number;
    teamAccuracy: number;
    durationMs: number;
    players: Array<{
      userId: string;
      seat: number;
      wpm: number;
      accuracy: number;
      correctChars: number;
      incorrectChars: number;
    }>;
  } | null;
}) {
  if (!result && room?.status !== "finished") return null;
  const teamWpm = result?.teamWpm ?? 0;
  const teamAccuracy = result?.teamAccuracy ?? 0;
  const players = result?.players ?? [];

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 backdrop-blur-sm">
      <h2 className="text-xl font-semibold text-emerald-300">Match complete</h2>
      <p className="mt-2 text-zinc-300">
        Team WPM <strong>{Math.round(teamWpm)}</strong> · Accuracy{" "}
        <strong>{Math.round(teamAccuracy)}%</strong>
      </p>
      <ul className="mt-4 space-y-2 text-sm text-zinc-400">
        {players.map((p) => {
          const name =
            room?.players.find((rp) => rp.userId === p.userId)?.name ??
            `Seat ${p.seat + 1}`;
          return (
            <li key={p.userId}>
              {name}: {Math.round(p.wpm)} WPM · {Math.round(p.accuracy)}%
            </li>
          );
        })}
      </ul>
    </div>
  );
}
