import {
  compareWord,
  COUNTDOWN_MS,
  GameSettingsSchema,
  initialLives,
  isHardcoreWordComplete,
  isLifeWord,
  isPerfectWord,
  lifeWordTimeLimitMs,
  MAX_PLAYERS,
  MIN_PLAYERS,
  nextSeat,
  pickLifeWordIndices,
  playerStatsFromProgress,
  resolveLifeWord,
  ROOM_TTL_SECONDS,
  shouldUseHardcoreRules,
  teamStatsFromPlayers,
  tokenizeText,
  validateHardcoreInput,
  type GameSettings,
  type MatchResult,
  type PlayerProgress,
  type RoomState,
  type ServerMessage,
} from "@key-warriors/shared";

export function normalizeSettings(settings: GameSettings): GameSettings {
  return GameSettingsSchema.parse(settings);
}

export type ConnectionRecord = {
  connectionId: string;
  roomId: string;
  userId: string;
  seat: number;
  ttl: number;
};

export type RoomRecord = RoomState & {
  ttl: number;
  connectionIds: Record<string, string>; // userId -> connectionId
};

function now() {
  return Date.now();
}

function ttl() {
  return Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS;
}

function roomMaxPlayers(settings: GameSettings): number {
  return settings.maxPlayers ?? MAX_PLAYERS;
}

export function settingsEqual(a: GameSettings, b: GameSettings): boolean {
  return (
    a.mode === b.mode &&
    a.modeValue === b.modeValue &&
    (a.typingMode ?? "standard") === (b.typingMode ?? "standard") &&
    (a.livesEnabled ?? false) === (b.livesEnabled ?? false) &&
    (a.maxPlayers ?? MAX_PLAYERS) === (b.maxPlayers ?? MAX_PLAYERS) &&
    (a.customText ?? null) === (b.customText ?? null)
  );
}

export function createLobbyRoom(opts: {
  roomId: string;
  code: string;
  hostId: string;
  settings: GameSettings;
  words: string[];
}): RoomRecord {
  return {
    roomId: opts.roomId,
    code: opts.code.toUpperCase(),
    hostId: opts.hostId,
    status: "lobby",
    settings: normalizeSettings(opts.settings),
    words: opts.words,
    currentWordIndex: 0,
    turnSeat: 0,
    players: [],
    startedAt: null,
    endsAt: null,
    countdownEndsAt: null,
    activeInput: "",
    finishedAt: null,
    lives: initialLives(opts.settings),
    lifeWordIndices: opts.settings.livesEnabled
      ? pickLifeWordIndices(opts.words)
      : [],
    wordStartedAt: null,
    ttl: ttl(),
    connectionIds: {},
  };
}

export function addPlayer(
  room: RoomRecord,
  player: {
    userId: string;
    name: string;
    image?: string | null;
    connectionId: string;
  }
): { room: RoomRecord; error?: string } {
  const existing = room.players.find((p) => p.userId === player.userId);
  if (existing) {
    const next = {
      ...room,
      ttl: ttl(),
      connectionIds: {
        ...room.connectionIds,
        [player.userId]: player.connectionId,
      },
      players: room.players.map((p) =>
        p.userId === player.userId ? { ...p, connected: true, name: player.name, image: player.image ?? null } : p
      ),
    };
    return { room: next };
  }

  if (room.status !== "lobby") {
    return { room, error: "Game already started" };
  }
  if (room.players.length >= roomMaxPlayers(room.settings)) {
    const cap = roomMaxPlayers(room.settings);
    return { room, error: `Room is full (max ${cap} players)` };
  }

  const seat = room.players.length;
  const progress: PlayerProgress = {
    userId: player.userId,
    name: player.name,
    image: player.image ?? null,
    seat,
    ready: false,
    connected: true,
    correctChars: 0,
    incorrectChars: 0,
    completedWords: 0,
    timeActiveMs: 0,
  };

  return {
    room: {
      ...room,
      ttl: ttl(),
      connectionIds: {
        ...room.connectionIds,
        [player.userId]: player.connectionId,
      },
      players: [...room.players, progress],
    },
  };
}

export function setReady(
  room: RoomRecord,
  userId: string,
  ready: boolean
): RoomRecord {
  return {
    ...room,
    ttl: ttl(),
    players: room.players.map((p) =>
      p.userId === userId ? { ...p, ready } : p
    ),
  };
}

export function updateSettings(
  room: RoomRecord,
  userId: string,
  settings: GameSettings,
  words: string[]
): { room: RoomRecord; error?: string } {
  if (room.hostId !== userId) {
    return { room, error: "Only the host can change settings" };
  }
  if (room.status !== "lobby") {
    return { room, error: "Cannot change settings after start" };
  }
  const cap = roomMaxPlayers(settings);
  if (cap < room.players.length) {
    return {
      room,
      error: `Cannot set max players to ${cap} while ${room.players.length} are in the room`,
    };
  }
  const normalized = normalizeSettings(settings);
  if (settingsEqual(room.settings, normalized)) {
    return { room: { ...room, ttl: ttl() } };
  }
  return {
    room: {
      ...room,
      settings: normalized,
      words,
      lifeWordIndices: settings.livesEnabled
        ? pickLifeWordIndices(words)
        : [],
      lives: initialLives(settings),
      ttl: ttl(),
      players: room.players.map((p) => ({ ...p, ready: false })),
    },
  };
}

export function startCountdown(
  room: RoomRecord,
  userId: string
): { room: RoomRecord; error?: string } {
  if (room.hostId !== userId) {
    return { room, error: "Only the host can start" };
  }
  if (room.players.length < MIN_PLAYERS) {
    return { room, error: `Need at least ${MIN_PLAYERS} players` };
  }
  const connected = room.players.filter((p) => p.connected);
  if (connected.length < MIN_PLAYERS) {
    return { room, error: `Need at least ${MIN_PLAYERS} connected players` };
  }
  const cap = roomMaxPlayers(room.settings);
  if (cap === 2 && connected.length !== 2) {
    return { room, error: "2-player room needs exactly 2 connected players" };
  }
  if (!connected.every((p) => p.ready)) {
    return { room, error: "All players must be ready" };
  }
  if (room.words.length === 0) {
    return { room, error: "No words configured" };
  }

  const endsAt = now() + COUNTDOWN_MS;
  return {
    room: {
      ...room,
      status: "countdown",
      countdownEndsAt: endsAt,
      currentWordIndex: 0,
      turnSeat: 0,
      activeInput: "",
      startedAt: null,
      endsAt: null,
      finishedAt: null,
      ttl: ttl(),
      players: room.players.map((p) => ({
        ...p,
        correctChars: 0,
        incorrectChars: 0,
        completedWords: 0,
        timeActiveMs: 0,
      })),
    },
  };
}

export function beginPlaying(room: RoomRecord): RoomRecord {
  const startedAt = now();
  const endsAt =
    room.settings.mode === "time" && room.settings.modeValue
      ? startedAt + room.settings.modeValue * 1000
      : null;

  return {
    ...room,
    status: "playing",
    startedAt,
    endsAt,
    countdownEndsAt: null,
    lives: initialLives(room.settings),
    lifeWordIndices: room.settings.livesEnabled
      ? pickLifeWordIndices(room.words)
      : room.lifeWordIndices ?? [],
    wordStartedAt: startedAt,
    ttl: ttl(),
  };
}

export function applyKeystroke(
  room: RoomRecord,
  userId: string,
  input: string,
  wordIndex: number
): {
  room: RoomRecord;
  error?: string;
  broadcast?: boolean;
  finished?: boolean;
  result?: MatchResult;
  correct?: boolean;
  autoCompleted?: boolean;
} {
  if (room.status !== "playing") {
    return { room, error: "Game is not in progress" };
  }

  if (room.endsAt != null && now() >= room.endsAt) {
    return finalize(room);
  }

  const player = room.players.find((p) => p.userId === userId);
  if (!player) return { room, error: "Not in room" };
  if (player.seat !== room.turnSeat) {
    return { room, error: "Not your turn" };
  }
  if (wordIndex !== room.currentWordIndex) {
    return { room, error: "Word index mismatch" };
  }

  const expected = room.words[wordIndex];
  if (!expected) return { room, error: "No word at index" };

  const hardcore = shouldUseHardcoreRules(room.settings);
  let nextInput = input;

  if (hardcore) {
    const check = validateHardcoreInput(room.activeInput, input);
    if (!check.ok) return { room, error: check.reason };
    nextInput = input.slice(0, expected.length);
    if (isHardcoreWordComplete(expected, nextInput)) {
      return completeWord(room, userId, wordIndex, nextInput);
    }
  }

  const wordStartedAt =
    room.activeInput.length === 0 && nextInput.length > 0
      ? now()
      : room.wordStartedAt;

  return {
    room: {
      ...room,
      activeInput: nextInput,
      wordStartedAt: wordStartedAt ?? room.wordStartedAt,
      ttl: ttl(),
    },
    broadcast: true,
  };
}

function applyLifeChanges(
  room: RoomRecord,
  wordIndex: number,
  perfect: boolean,
  hadErrors: boolean,
  wordStartedAt: number | null
): { room: RoomRecord; gameOver: boolean } {
  const lives = room.lives ?? 0;
  const lifeIndices = room.lifeWordIndices ?? [];
  const isLife = isLifeWord(wordIndex, lifeIndices);
  const expected = room.words[wordIndex] ?? "";
  const elapsed =
    wordStartedAt != null ? now() - wordStartedAt : Number.POSITIVE_INFINITY;
  const withinTime = elapsed <= lifeWordTimeLimitMs(expected);

  const outcome = resolveLifeWord(
    lives,
    !!room.settings.livesEnabled,
    isLife,
    perfect,
    withinTime,
    hadErrors
  );

  let newLives = lives;
  if (outcome.type === "gain") newLives = outcome.newLives;
  if (outcome.type === "lose") newLives = outcome.newLives;

  return {
    room: { ...room, lives: newLives },
    gameOver: room.settings.livesEnabled && newLives <= 0,
  };
}

export function completeWord(
  room: RoomRecord,
  userId: string,
  wordIndex: number,
  input: string
): {
  room: RoomRecord;
  error?: string;
  finished?: boolean;
  result?: MatchResult;
  correct?: boolean;
  autoCompleted?: boolean;
} {
  if (room.status !== "playing") {
    return { room, error: "Game is not in progress" };
  }
  const player = room.players.find((p) => p.userId === userId);
  if (!player) return { room, error: "Not in room" };
  if (player.seat !== room.turnSeat) {
    return { room, error: "Not your turn" };
  }
  if (wordIndex !== room.currentWordIndex) {
    return { room, error: "Word index mismatch" };
  }

  const expected = room.words[wordIndex];
  if (!expected) return { room, error: "No word at index" };

  const typed = input.replace(/\s+$/, "");
  const cmp = compareWord(expected, typed);
  const perfect = isPerfectWord(expected, typed);
  const hadErrors = !perfect;

  const players = room.players.map((p) => {
    if (p.userId !== userId) return p;
    return {
      ...p,
      correctChars: p.correctChars + cmp.correctChars,
      incorrectChars: p.incorrectChars + cmp.incorrectChars,
      completedWords: p.completedWords + 1,
    };
  });

  let nextWordIndex = wordIndex + 1;
  const hardcore = shouldUseHardcoreRules(room.settings);
  // Perfect word in hardcore: same player chains to next word
  const keepTurn = hardcore && perfect;
  const nextTurn = keepTurn
    ? room.turnSeat
    : nextSeat(room.turnSeat, players.length);

  let nextRoom: RoomRecord = {
    ...room,
    players,
    currentWordIndex: nextWordIndex,
    turnSeat: nextTurn,
    activeInput: "",
    wordStartedAt: now(),
    ttl: ttl(),
  };

  const lifeResult = applyLifeChanges(
    nextRoom,
    wordIndex,
    perfect,
    hadErrors,
    room.wordStartedAt ?? null
  );
  nextRoom = lifeResult.room;

  if (lifeResult.gameOver) {
    return finalize(nextRoom);
  }

  const timeUp = room.endsAt != null && now() >= room.endsAt;
  const wordsDone =
    (room.settings.mode === "words" ||
      room.settings.mode === "quote" ||
      room.settings.mode === "custom") &&
    nextWordIndex >= room.words.length;

  if (timeUp || wordsDone) {
    return finalize(nextRoom);
  }

  return { room: nextRoom, correct: perfect, autoCompleted: hardcore };
}

export function finalize(room: RoomRecord): {
  room: RoomRecord;
  finished: true;
  result: MatchResult;
  correct?: boolean;
} {
  const finishedAt = now();
  const durationMs = Math.max(1, finishedAt - (room.startedAt ?? finishedAt));
  const team = teamStatsFromPlayers(room.players, durationMs);
  const result: MatchResult = {
    roomId: room.roomId,
    mode: room.settings.mode,
    modeValue: room.settings.modeValue,
    sourceText: room.words.join(" "),
    teamWpm: team.teamWpm,
    teamAccuracy: team.teamAccuracy,
    durationMs,
    players: room.players.map((p) => playerStatsFromProgress(p, durationMs)),
  };

  return {
    room: {
      ...room,
      status: "finished",
      finishedAt,
      ttl: ttl(),
    },
    finished: true,
    result,
  };
}

export function markDisconnected(
  room: RoomRecord,
  userId: string,
  connectionId: string
): RoomRecord | null {
  const activeConnectionId = room.connectionIds[userId];
  if (activeConnectionId != null && activeConnectionId !== connectionId) {
    return null;
  }
  const { [userId]: _, ...rest } = room.connectionIds;
  return {
    ...room,
    connectionIds: rest,
    players: room.players.map((p) =>
      p.userId === userId ? { ...p, connected: false, ready: false } : p
    ),
    ttl: ttl(),
  };
}

export function toPublicRoom(room: RoomRecord): RoomState {
  const {
    ttl: _ttl,
    connectionIds: _c,
    ...publicRoom
  } = room;
  return publicRoom;
}

export function roomStateMessage(room: RoomRecord): ServerMessage {
  return { type: "room_state", room: toPublicRoom(room) };
}

export function ensureWords(text: string): string[] {
  return tokenizeText(text);
}
