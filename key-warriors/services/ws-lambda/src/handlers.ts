import type {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { parseClientMessage, ROOM_TTL_SECONDS } from "@key-warriors/shared";
import {
  addPlayer,
  applyKeystroke,
  beginPlaying,
  completeWord,
  createLobbyRoom,
  markDisconnected,
  roomStateMessage,
  settingsEqual,
  startCountdown,
  toPublicRoom,
  updateSettings,
  type RoomRecord,
} from "./game-engine.js";
import {
  deleteConnection,
  findRoomByCodeScan,
  getConnection,
  getRoom,
  getRoomByCode,
  putConnection,
  putRoom,
} from "./dynamo.js";
import {
  broadcastRoom,
  createApiClient,
  persistMatchResult,
  sendToConnection,
} from "./broadcast.js";

function ok(body?: unknown): APIGatewayProxyResultV2 {
  return { statusCode: 200, body: body ? JSON.stringify(body) : "ok" };
}

function endpointFromEvent(event: APIGatewayProxyWebsocketEventV2) {
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  return `https://${domain}/${stage}`;
}

async function resolveRoomByCode(code: string): Promise<RoomRecord | null> {
  try {
    return (await getRoomByCode(code)) ?? (await findRoomByCodeScan(code));
  } catch {
    return findRoomByCodeScan(code);
  }
}

export async function connectHandler(
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> {
  const connectionId = event.requestContext.connectionId;
  const params = event.queryStringParameters ?? {};
  const userId = params.userId;
  if (!userId) {
    return { statusCode: 401, body: "userId required" };
  }

  await putConnection({
    connectionId,
    roomId: "",
    userId,
    seat: -1,
    ttl: Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS,
  });

  return ok();
}

export async function disconnectHandler(
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> {
  const connectionId = event.requestContext.connectionId;
  const conn = await getConnection(connectionId);
  if (conn?.roomId) {
    const room = await getRoom(conn.roomId);
    if (room) {
      const next = markDisconnected(room, conn.userId, connectionId);
      if (next) {
        await putRoom(next);
        const api = createApiClient(endpointFromEvent(event));
        await broadcastRoom(api, room.roomId, {
          type: "player_left",
          room: toPublicRoom(next),
        });
      }
    }
  }
  await deleteConnection(connectionId);
  return ok();
}

export async function defaultHandler(
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> {
  const connectionId = event.requestContext.connectionId;
  const api = createApiClient(endpointFromEvent(event));

  let message;
  try {
    message = parseClientMessage(JSON.parse(event.body ?? "{}"));
  } catch {
    await sendToConnection(api, connectionId, {
      type: "error",
      message: "Invalid message",
    });
    return ok();
  }

  const conn = await getConnection(connectionId);
  if (!conn) {
    await sendToConnection(api, connectionId, {
      type: "error",
      message: "Unknown connection",
    });
    return ok();
  }

  try {
    switch (message.type) {
      case "ping": {
        await sendToConnection(api, connectionId, { type: "pong" });
        break;
      }
      case "join_room": {
        let room = await resolveRoomByCode(message.code);
        const createMaxPlayers = message.maxPlayers === 2 ? 2 : 3;
        const createMode = message.mode ?? "words";
        const createModeValue =
          message.modeValue ??
          (createMode === "time" ? 60 : createMode === "words" ? 25 : null);
        if (!room) {
          if (!message.create) {
            await sendToConnection(api, connectionId, {
              type: "error",
              message: "Waiting for host to open the room…",
              code: "ROOM_NOT_FOUND",
            });
            break;
          }
          // Create ephemeral lobby keyed by code (REST room id may differ)
          room = createLobbyRoom({
            roomId: message.code.toUpperCase(),
            code: message.code,
            hostId: message.userId,
            settings: {
              mode: createMode,
              modeValue: createModeValue,
              typingMode: "standard",
              livesEnabled: false,
              customText: null,
              maxPlayers: createMaxPlayers,
            },
            words: [],
          });
        }

        const added = addPlayer(room, {
          userId: message.userId,
          name: message.name,
          image: message.image,
          connectionId,
        });
        if (added.error) {
          await sendToConnection(api, connectionId, {
            type: "error",
            message: added.error,
          });
          break;
        }

        const player = added.room.players.find((p) => p.userId === message.userId)!;
        await putRoom(added.room);
        await putConnection({
          connectionId,
          roomId: added.room.roomId,
          userId: message.userId,
          seat: player.seat,
          ttl: Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS,
        });

        await sendToConnection(api, connectionId, roomStateMessage(added.room));
        await broadcastRoom(api, added.room.roomId, {
          type: "player_joined",
          room: toPublicRoom(added.room),
        }, connectionId);
        break;
      }
      case "ready": {
        const room = await getRoom(conn.roomId);
        if (!room) {
          await sendToConnection(api, connectionId, {
            type: "error",
            message: "Not in a room",
          });
          break;
        }
        const next = setReadySafe(room, conn.userId, message.ready);
        await putRoom(next);
        await sendToConnection(api, connectionId, roomStateMessage(next));
        await broadcastRoom(api, room.roomId, roomStateMessage(next), connectionId);
        break;
      }
      case "update_settings": {
        const room = await getRoom(conn.roomId);
        if (!room) break;
        const prevSettings = room.settings;
        const words =
          message.settings.customText?.trim()
            ? message.settings.customText.trim().split(/\s+/).filter(Boolean)
            : room.words;
        const updated = updateSettings(
          room,
          conn.userId,
          message.settings,
          words
        );
        if (updated.error) {
          await sendToConnection(api, connectionId, {
            type: "error",
            message: updated.error,
          });
          break;
        }
        await putRoom(updated.room);
        if (!settingsEqual(prevSettings, updated.room.settings)) {
          await sendToConnection(api, connectionId, roomStateMessage(updated.room));
          await broadcastRoom(api, room.roomId, roomStateMessage(updated.room), connectionId);
        }
        break;
      }
      case "host_start": {
        const room = await getRoom(conn.roomId);
        if (!room) break;

        // Fill words if empty via settings defaults
        let withWords = room;
        if (room.words.length === 0) {
          withWords = {
            ...room,
            words: fallbackWords(room.settings.modeValue ?? 25),
          };
        }

        const started = startCountdown(withWords, conn.userId);
        if (started.error) {
          await sendToConnection(api, connectionId, {
            type: "error",
            message: started.error,
          });
          break;
        }

        await putRoom(started.room);
        await broadcastRoom(api, room.roomId, {
          type: "countdown",
          endsAt: started.room.countdownEndsAt!,
          room: toPublicRoom(started.room),
        });

        // Transition to playing after countdown (best-effort in Lambda)
        const delay = Math.max(
          0,
          (started.room.countdownEndsAt ?? Date.now()) - Date.now()
        );
        await new Promise((r) => setTimeout(r, delay));
        const latest = (await getRoom(room.roomId)) ?? started.room;
        if (latest.status === "countdown") {
          const playing = beginPlaying(latest);
          await putRoom(playing);
          await broadcastRoom(api, room.roomId, {
            type: "turn_changed",
            turnSeat: playing.turnSeat,
            currentWordIndex: playing.currentWordIndex,
            room: toPublicRoom(playing),
          });
        }
        break;
      }
      case "keystroke": {
        const room = await getRoom(conn.roomId);
        if (!room) break;
        const applied = applyKeystroke(
          room,
          conn.userId,
          message.input,
          message.wordIndex
        );
        if (applied.error) {
          await sendToConnection(api, connectionId, {
            type: "error",
            message: applied.error,
            code: "INVALID_KEYSTROKE",
          });
          break;
        }
        await putRoom(applied.room);
        if (applied.finished && applied.result) {
          await persistMatchResult(applied.result);
          await broadcastRoom(api, room.roomId, {
            type: "game_finished",
            result: applied.result,
            room: toPublicRoom(applied.room),
          });
          break;
        }
        if (applied.autoCompleted) {
          await broadcastRoom(api, room.roomId, {
            type: "word_result",
            wordIndex: message.wordIndex,
            correct: applied.correct ?? false,
            room: toPublicRoom(applied.room),
          });
          await broadcastRoom(api, room.roomId, {
            type: "turn_changed",
            turnSeat: applied.room.turnSeat,
            currentWordIndex: applied.room.currentWordIndex,
            room: toPublicRoom(applied.room),
          });
          break;
        }
        const seat =
          applied.room.players.find((p) => p.userId === conn.userId)?.seat ?? 0;
        await broadcastRoom(
          api,
          room.roomId,
          {
            type: "keystroke_broadcast",
            seat,
            input: applied.room.activeInput,
            wordIndex: message.wordIndex,
          },
          connectionId
        );
        break;
      }
      case "word_complete": {
        const room = await getRoom(conn.roomId);
        if (!room) break;
        const done = completeWord(
          room,
          conn.userId,
          message.wordIndex,
          message.input
        );
        if (done.error) {
          await sendToConnection(api, connectionId, {
            type: "error",
            message: done.error,
          });
          break;
        }
        await putRoom(done.room);
        if (done.finished && done.result) {
          await persistMatchResult(done.result);
          await broadcastRoom(api, room.roomId, {
            type: "game_finished",
            result: done.result,
            room: toPublicRoom(done.room),
          });
        } else {
          await broadcastRoom(api, room.roomId, {
            type: "word_result",
            wordIndex: message.wordIndex,
            correct: done.correct ?? false,
            room: toPublicRoom(done.room),
          });
          await broadcastRoom(api, room.roomId, {
            type: "turn_changed",
            turnSeat: done.room.turnSeat,
            currentWordIndex: done.room.currentWordIndex,
            room: toPublicRoom(done.room),
          });
        }
        break;
      }
      case "leave_room": {
        const room = await getRoom(conn.roomId);
        if (room) {
          const next = markDisconnected(room, conn.userId, connectionId);
          if (next) {
            await putRoom(next);
            await broadcastRoom(api, room.roomId, {
              type: "player_left",
              room: toPublicRoom(next),
            });
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error(err);
    await sendToConnection(api, connectionId, {
      type: "error",
      message: "Internal error",
    });
  }

  return ok();
}

function setReadySafe(room: RoomRecord, userId: string, ready: boolean) {
  return {
    ...room,
    players: room.players.map((p) =>
      p.userId === userId ? { ...p, ready } : p
    ),
  };
}

const FALLBACK = [
  "the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog",
  "pack", "my", "box", "with", "five", "dozen", "liquor", "jugs",
  "type", "fast", "with", "friends", "and", "share", "every", "word",
  "accuracy", "matters", "more", "than", "raw", "speed", "alone",
];

function fallbackWords(count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(FALLBACK[i % FALLBACK.length]!);
  }
  return out;
}
