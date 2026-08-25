"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClientMessage,
  GameMode,
  PlayerCount,
  RoomState,
  ServerMessage,
} from "@key-warriors/shared";
import { getWebSocketUrl } from "@/lib/ws-url";

type UseGameSocketOptions = {
  userId: string;
  name: string;
  image?: string | null;
  code: string;
  initialMode?: GameMode;
  initialModeValue?: number | null;
  initialMaxPlayers?: PlayerCount;
  /** True when this client created the room (host opening lobby). */
  isCreator?: boolean;
  enabled?: boolean;
};

export function useGameSocket({
  userId,
  name,
  image,
  code,
  initialMode = "words",
  initialModeValue = 25,
  initialMaxPlayers = 3,
  isCreator = false,
  enabled = true,
}: UseGameSocketOptions) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wordResults, setWordResults] = useState<Record<number, boolean>>({});
  const [result, setResult] = useState<Extract<
    ServerMessage,
    { type: "game_finished" }
  >["result"] | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const joinRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const joinConfigRef = useRef({
    initialMode,
    initialModeValue,
    initialMaxPlayers,
    isCreator,
  });
  joinConfigRef.current = {
    initialMode,
    initialModeValue,
    initialMaxPlayers,
    isCreator,
  };

  const buildJoinMessage = useCallback((): ClientMessage => {
    const cfg = joinConfigRef.current;
    return {
      type: "join_room",
      code: code.toUpperCase(),
      userId,
      name,
      image: image ?? null,
      maxPlayers: cfg.initialMaxPlayers,
      mode: cfg.initialMode,
      modeValue: cfg.initialModeValue,
      ...(cfg.isCreator ? { create: true } : {}),
    };
  }, [code, userId, name, image]);

  const send = useCallback((message: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const setReady = useCallback(
    (ready: boolean) => {
      if (!joined) {
        setError("Still joining the room — try again in a moment.");
        return;
      }
      if (!send({ type: "ready", ready })) {
        setError("Not connected — wait for Connected before readying up.");
        return;
      }
      setError(null);
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              players: prev.players.map((p) =>
                p.userId === userId ? { ...p, ready } : p
              ),
            }
          : prev
      );
    },
    [send, userId, joined]
  );

  useEffect(() => {
    if (!enabled) return;

    let closedIntentionally = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let activeSocket: WebSocket | null = null;

    const clearJoinRetry = () => {
      if (joinRetryRef.current) {
        clearTimeout(joinRetryRef.current);
        joinRetryRef.current = null;
      }
    };

    const sendJoinOn = (ws: WebSocket) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify(buildJoinMessage()));
    };

    const scheduleJoinRetry = (ws: WebSocket) => {
      clearJoinRetry();
      joinRetryRef.current = setTimeout(() => {
        if (wsRef.current === ws && ws.readyState === WebSocket.OPEN) {
          sendJoinOn(ws);
        }
      }, 1500);
    };

    const connect = () => {
      const wsUrl = getWebSocketUrl();
      if (!wsUrl) {
        setError(
          "WebSocket URL not configured. Set NEXT_PUBLIC_WS_URL in apps/web/.env.local"
        );
        return;
      }

      const url = new URL(wsUrl);
      url.searchParams.set("userId", userId);
      url.searchParams.set("name", name);
      if (image) url.searchParams.set("image", image);

      const ws = new WebSocket(url.toString());
      activeSocket = ws;
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        setConnected(true);
        setError(null);
        reconnectAttempt.current = 0;
        sendJoinOn(ws);
      };

      ws.onmessage = (event) => {
        if (wsRef.current !== ws) return;
        try {
          const msg = JSON.parse(String(event.data)) as ServerMessage;
          switch (msg.type) {
            case "room_state":
            case "player_joined":
            case "player_left":
            case "countdown":
            case "turn_changed":
              clearJoinRetry();
              setJoined(true);
              setError(null);
              setRoom(msg.room);
              break;
            case "word_result":
              setRoom(msg.room);
              setWordResults((prev) => ({
                ...prev,
                [msg.wordIndex]: msg.correct,
              }));
              break;
            case "keystroke_broadcast":
              setRoom((prev) =>
                prev
                  ? {
                      ...prev,
                      activeInput: msg.input,
                      currentWordIndex: msg.wordIndex,
                      turnSeat: msg.seat,
                    }
                  : prev
              );
              break;
            case "game_finished":
              setRoom(msg.room);
              setResult(msg.result);
              break;
            case "error":
              if (msg.code === "ROOM_NOT_FOUND") {
                setError(
                  joinConfigRef.current.isCreator
                    ? "Could not create room — retrying…"
                    : "Waiting for host to open the room…"
                );
                scheduleJoinRetry(ws);
              } else {
                setError(msg.message);
              }
              break;
            default:
              break;
          }
        } catch {
          setError("Invalid server message");
        }
      };

      ws.onclose = () => {
        // Ignore stale sockets from Strict Mode remounts / reconnect races
        if (wsRef.current !== ws) return;
        setConnected(false);
        setJoined(false);
        wsRef.current = null;
        clearJoinRetry();
        if (!closedIntentionally && reconnectAttempt.current < 8) {
          const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 15000);
          reconnectAttempt.current += 1;
          reconnectTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        if (wsRef.current !== ws) return;
        setError(
          `Cannot connect to ${wsUrl}. On the host Mac, run: pnpm dev:ws (port 3001 must be reachable on your network).`
        );
      };
    };

    connect();

    return () => {
      closedIntentionally = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearJoinRetry();
      const ws = activeSocket;
      activeSocket = null;
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      ws?.close();
    };
  }, [enabled, userId, name, image, code, buildJoinMessage]);

  return {
    room,
    connected,
    joined,
    error,
    result,
    wordResults,
    send,
    setReady,
    setRoom,
  };
}
