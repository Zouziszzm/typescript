import { z } from "zod";
import {
  GameModeSchema,
  GameSettingsSchema,
  MatchResultSchema,
  RoomStateSchema,
} from "./types.js";

/** Client → Server */
export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join_room"),
    code: z.string().length(6),
    userId: z.string(),
    name: z.string(),
    image: z.string().nullable().optional(),
    /** Used when creating a new in-memory lobby (first joiner). */
    maxPlayers: z.union([z.literal(2), z.literal(3)]).optional(),
    mode: GameModeSchema.optional(),
    modeValue: z.number().int().positive().nullable().optional(),
    /** True only when opening a room you created (host). Joiners must omit. */
    create: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("leave_room"),
  }),
  z.object({
    type: z.literal("ready"),
    ready: z.boolean(),
  }),
  z.object({
    type: z.literal("update_settings"),
    settings: GameSettingsSchema,
  }),
  z.object({
    type: z.literal("host_start"),
  }),
  z.object({
    type: z.literal("keystroke"),
    input: z.string(),
    wordIndex: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("word_complete"),
    wordIndex: z.number().int().nonnegative(),
    input: z.string(),
  }),
  z.object({
    type: z.literal("ping"),
  }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

/** Server → Client */
export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("room_state"),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("player_joined"),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("player_left"),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("countdown"),
    endsAt: z.number(),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("turn_changed"),
    turnSeat: z.number().int(),
    currentWordIndex: z.number().int(),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("keystroke_broadcast"),
    seat: z.number().int(),
    input: z.string(),
    wordIndex: z.number().int(),
  }),
  z.object({
    type: z.literal("word_result"),
    wordIndex: z.number().int(),
    correct: z.boolean(),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("game_finished"),
    result: MatchResultSchema,
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    code: z.string().optional(),
  }),
  z.object({
    type: z.literal("pong"),
  }),
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

export function parseClientMessage(data: unknown): ClientMessage {
  return ClientMessageSchema.parse(data);
}

export function parseServerMessage(data: unknown): ServerMessage {
  return ServerMessageSchema.parse(data);
}
