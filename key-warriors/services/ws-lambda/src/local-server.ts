import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import {
  parseClientMessage,
  ROOM_TTL_SECONDS,
  type ServerMessage,
} from "@key-warriors/shared";
import {
  addPlayer,
  applyKeystroke,
  beginPlaying,
  completeWord,
  createLobbyRoom,
  markDisconnected,
  roomStateMessage,
  startCountdown,
  toPublicRoom,
  settingsEqual,
  updateSettings,
  type RoomRecord,
} from "./game-engine.js";
import { memoryStore } from "./memory-store.js";
import { persistMatchResult } from "./broadcast.js";

const PORT = Number(process.env.WS_PORT ?? 3001);

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Keyboard Warriors WS\n");
});

const wss = new WebSocketServer({ server });
const sockets = new Map<string, WebSocket>();

function send(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(roomId: string, message: ServerMessage, exclude?: string) {
  for (const conn of memoryStore.listConnectionsForRoom(roomId)) {
    if (conn.connectionId === exclude) continue;
    const sock = sockets.get(conn.connectionId);
    if (sock) send(sock, message);
  }
}

async function persistMatch(result: unknown) {
  try {
    await persistMatchResult(result);
  } catch (err) {
    console.error("[local-ws] failed to persist match", err);
  }
}

const FALLBACK = [
  "the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog",
  "pack", "my", "box", "with", "five", "dozen", "liquor", "jugs",
  "type", "fast", "with", "friends", "and", "share", "every", "word",
  "accuracy", "matters", "more", "than", "raw", "speed", "alone",
  "keyboard", "warriors", "collaborate", "together", "on", "each", "turn",
];

function fallbackWords(count: number): string[] {
  return Array.from({ length: count }, (_, i) => FALLBACK[i % FALLBACK.length]!);
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const userId = url.searchParams.get("userId");
  const name = url.searchParams.get("name") ?? "Player";
  const image = url.searchParams.get("image");

  if (!userId) {
    send(ws, { type: "error", message: "userId required" });
    ws.close();
    return;
  }

  const connectionId = crypto.randomUUID();
  sockets.set(connectionId, ws);
  memoryStore.putConnection({
    connectionId,
    roomId: "",
    userId,
    seat: -1,
    ttl: Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS,
  });

  ws.on("message", async (raw) => {
    let message;
    try {
      message = parseClientMessage(JSON.parse(String(raw)));
    } catch {
      send(ws, { type: "error", message: "Invalid message" });
      return;
    }

    const conn = memoryStore.getConnection(connectionId);
    if (!conn) return;

    switch (message.type) {
      case "ping":
        send(ws, { type: "pong" });
        break;
      case "join_room": {
        let room = memoryStore.getRoomByCode(message.code);
        const createMaxPlayers = message.maxPlayers === 2 ? 2 : 3;
        const createMode = message.mode ?? "words";
        const createModeValue =
          message.modeValue ??
          (createMode === "time" ? 60 : createMode === "words" ? 25 : null);
        const createWordCount =
          createMode === "words" ? createModeValue ?? 25 : 25;
        if (!room) {
          if (!message.create) {
            send(ws, {
              type: "error",
              message: "Waiting for host to open the room…",
              code: "ROOM_NOT_FOUND",
            });
            break;
          }
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
            words: fallbackWords(createWordCount),
          });
        }
        const added = addPlayer(room, {
          userId: message.userId,
          name: message.name,
          image: message.image,
          connectionId,
        });
        if (added.error) {
          send(ws, { type: "error", message: added.error });
          break;
        }
        const player = added.room.players.find((p) => p.userId === message.userId)!;
        memoryStore.putRoom(added.room);
        memoryStore.putConnection({
          connectionId,
          roomId: added.room.roomId,
          userId: message.userId,
          seat: player.seat,
          ttl: Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS,
        });
        send(ws, roomStateMessage(added.room));
        broadcast(added.room.roomId, {
          type: "player_joined",
          room: toPublicRoom(added.room),
        }, connectionId);
        break;
      }
      case "ready": {
        const room = memoryStore.getRoom(conn.roomId);
        if (!room) {
          send(ws, { type: "error", message: "Not in a room" });
          break;
        }
        const next: RoomRecord = {
          ...room,
          players: room.players.map((p) =>
            p.userId === conn.userId ? { ...p, ready: message.ready } : p
          ),
        };
        memoryStore.putRoom(next);
        send(ws, roomStateMessage(next));
        broadcast(room.roomId, roomStateMessage(next), connectionId);
        break;
      }
      case "update_settings": {
        const room = memoryStore.getRoom(conn.roomId);
        if (!room) break;
        const prevSettings = room.settings;
        const count =
          message.settings.mode === "words"
            ? message.settings.modeValue ?? 25
            : message.settings.mode === "time"
              ? Math.max(50, Math.ceil(((message.settings.modeValue ?? 60) / 60) * 80))
              : 40;
        const words = message.settings.customText?.trim()
          ? message.settings.customText.trim().split(/\s+/).filter(Boolean)
          : fallbackWords(count);
        const updated = updateSettings(room, conn.userId, message.settings, words);
        if (updated.error) {
          send(ws, { type: "error", message: updated.error });
          break;
        }
        memoryStore.putRoom(updated.room);
        if (!settingsEqual(prevSettings, updated.room.settings)) {
          send(ws, roomStateMessage(updated.room));
          broadcast(room.roomId, roomStateMessage(updated.room), connectionId);
        }
        break;
      }
      case "host_start": {
        const room = memoryStore.getRoom(conn.roomId);
        if (!room) break;
        let withWords = room;
        if (room.words.length === 0) {
          withWords = { ...room, words: fallbackWords(room.settings.modeValue ?? 25) };
        }
        const started = startCountdown(withWords, conn.userId);
        if (started.error) {
          send(ws, { type: "error", message: started.error });
          break;
        }
        memoryStore.putRoom(started.room);
        broadcast(room.roomId, {
          type: "countdown",
          endsAt: started.room.countdownEndsAt!,
          room: toPublicRoom(started.room),
        });
        const delay = Math.max(0, (started.room.countdownEndsAt ?? Date.now()) - Date.now());
        setTimeout(() => {
          const latest = memoryStore.getRoom(room.roomId) ?? started.room;
          if (latest.status !== "countdown") return;
          const playing = beginPlaying(latest);
          memoryStore.putRoom(playing);
          broadcast(room.roomId, {
            type: "turn_changed",
            turnSeat: playing.turnSeat,
            currentWordIndex: playing.currentWordIndex,
            room: toPublicRoom(playing),
          });
        }, delay);
        break;
      }
      case "keystroke": {
        const room = memoryStore.getRoom(conn.roomId);
        if (!room) break;
        const applied = applyKeystroke(
          room,
          conn.userId,
          message.input,
          message.wordIndex
        );
        if (applied.error) {
          send(ws, { type: "error", message: applied.error });
          break;
        }
        memoryStore.putRoom(applied.room);
        if (applied.finished && applied.result) {
          await persistMatch(applied.result);
          broadcast(room.roomId, {
            type: "game_finished",
            result: applied.result,
            room: toPublicRoom(applied.room),
          });
          break;
        }
        if (applied.autoCompleted) {
          broadcast(room.roomId, {
            type: "word_result",
            wordIndex: message.wordIndex,
            correct: applied.correct ?? false,
            room: toPublicRoom(applied.room),
          });
          broadcast(room.roomId, {
            type: "turn_changed",
            turnSeat: applied.room.turnSeat,
            currentWordIndex: applied.room.currentWordIndex,
            room: toPublicRoom(applied.room),
          });
          break;
        }
        const seat =
          applied.room.players.find((p) => p.userId === conn.userId)?.seat ?? 0;
        broadcast(
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
        const room = memoryStore.getRoom(conn.roomId);
        if (!room) break;
        const done = completeWord(
          room,
          conn.userId,
          message.wordIndex,
          message.input
        );
        if (done.error) {
          send(ws, { type: "error", message: done.error });
          break;
        }
        memoryStore.putRoom(done.room);
        if (done.finished && done.result) {
          await persistMatch(done.result);
          broadcast(room.roomId, {
            type: "game_finished",
            result: done.result,
            room: toPublicRoom(done.room),
          });
        } else {
          broadcast(room.roomId, {
            type: "word_result",
            wordIndex: message.wordIndex,
            correct: done.correct ?? false,
            room: toPublicRoom(done.room),
          });
          broadcast(room.roomId, {
            type: "turn_changed",
            turnSeat: done.room.turnSeat,
            currentWordIndex: done.room.currentWordIndex,
            room: toPublicRoom(done.room),
          });
        }
        break;
      }
      case "leave_room": {
        const room = memoryStore.getRoom(conn.roomId);
        if (room) {
          const next = markDisconnected(room, conn.userId, connectionId);
          if (next) {
            memoryStore.putRoom(next);
            broadcast(room.roomId, {
              type: "player_left",
              room: toPublicRoom(next),
            });
          }
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    const conn = memoryStore.getConnection(connectionId);
    if (conn?.roomId) {
      const room = memoryStore.getRoom(conn.roomId);
      if (room) {
        const next = markDisconnected(room, conn.userId, connectionId);
        if (next) {
          memoryStore.putRoom(next);
          broadcast(room.roomId, {
            type: "player_left",
            room: toPublicRoom(next),
          });
        }
      }
    }
    memoryStore.deleteConnection(connectionId);
    sockets.delete(connectionId);
  });

  // silence unused
  void name;
  void image;
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Local WebSocket server listening on port ${PORT}`);
  console.log(`  Local:   ws://localhost:${PORT}`);
  console.log(`  Network: ws://<your-lan-ip>:${PORT}`);
});
