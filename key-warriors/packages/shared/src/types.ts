import { z } from "zod";

export const GameModeSchema = z.enum(["time", "words", "quote", "custom"]);
export type GameMode = z.infer<typeof GameModeSchema>;

export const TypingModeSchema = z.enum(["standard", "hardcore"]);
export type TypingMode = z.infer<typeof TypingModeSchema>;

export const TIME_OPTIONS = [15, 30, 60, 120] as const;
export const WORD_OPTIONS = [25, 50, 100] as const;
export const PLAYER_COUNT_OPTIONS = [2, 3] as const;
export type PlayerCount = (typeof PLAYER_COUNT_OPTIONS)[number];

export const MAX_LIVES = 3;
/** ms per character for life-word time limit (4 chars → 500ms) */
export const LIFE_MS_PER_CHAR = 125;

export const RoomStatusSchema = z.enum([
  "lobby",
  "countdown",
  "playing",
  "finished",
]);
export type RoomStatus = z.infer<typeof RoomStatusSchema>;

export const PlayerProgressSchema = z.object({
  userId: z.string(),
  name: z.string(),
  image: z.string().nullable().optional(),
  seat: z.number().int().min(0).max(2),
  ready: z.boolean(),
  connected: z.boolean(),
  correctChars: z.number().int().nonnegative(),
  incorrectChars: z.number().int().nonnegative(),
  completedWords: z.number().int().nonnegative(),
  timeActiveMs: z.number().nonnegative(),
});
export type PlayerProgress = z.infer<typeof PlayerProgressSchema>;

export const GameSettingsSchema = z.object({
  mode: GameModeSchema,
  modeValue: z.number().int().positive().nullable(),
  customText: z.string().max(5000).nullable().optional(),
  typingMode: TypingModeSchema.default("standard"),
  livesEnabled: z.boolean().default(false),
  maxPlayers: z.union([z.literal(2), z.literal(3)]).default(3),
});
export type GameSettings = z.infer<typeof GameSettingsSchema>;

export const RoomStateSchema = z.object({
  roomId: z.string(),
  code: z.string().length(6),
  hostId: z.string(),
  status: RoomStatusSchema,
  settings: GameSettingsSchema,
  words: z.array(z.string()),
  currentWordIndex: z.number().int().nonnegative(),
  turnSeat: z.number().int().min(0).max(2),
  players: z.array(PlayerProgressSchema),
  startedAt: z.number().nullable(),
  endsAt: z.number().nullable(),
  countdownEndsAt: z.number().nullable(),
  activeInput: z.string(),
  finishedAt: z.number().nullable().optional(),
  /** Team lives (hardcore + lives mode) */
  lives: z.number().int().min(0).max(MAX_LIVES).optional(),
  /** Word indices that can restore a life when typed perfectly in time */
  lifeWordIndices: z.array(z.number().int()).optional(),
  /** Timestamp when the active player started the current word */
  wordStartedAt: z.number().nullable().optional(),
});
export type RoomState = z.infer<typeof RoomStateSchema>;

export const PlayerStatsSchema = z.object({
  userId: z.string(),
  seat: z.number().int(),
  wpm: z.number(),
  accuracy: z.number(),
  correctChars: z.number().int(),
  incorrectChars: z.number().int(),
  completedWords: z.number().int(),
});
export type PlayerStats = z.infer<typeof PlayerStatsSchema>;

export const MatchResultSchema = z.object({
  roomId: z.string(),
  mode: GameModeSchema,
  modeValue: z.number().int().nullable(),
  sourceText: z.string(),
  teamWpm: z.number(),
  teamAccuracy: z.number(),
  durationMs: z.number().int(),
  players: z.array(PlayerStatsSchema),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;
