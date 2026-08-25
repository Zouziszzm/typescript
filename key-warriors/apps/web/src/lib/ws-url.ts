const DEFAULT_WS_PORT = "3001";

/**
 * WebSocket URL for the current browser tab.
 * Uses the same hostname as the page so LAN access works automatically
 * (localhost → ws://localhost:3001, 192.168.x.x → ws://192.168.x.x:3001).
 */
export function getWebSocketUrl(): string | null {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_WS_URL ?? null;
  }

  const configured = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";

  try {
    const configuredUrl = new URL(configured);
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const port = configuredUrl.port || DEFAULT_WS_PORT;
    return `${protocol}//${window.location.hostname}:${port}`;
  } catch {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname}:${DEFAULT_WS_PORT}`;
  }
}

/** HTTP health check for the local WS server (same host/port as WebSocket). */
export function getWebSocketHealthUrl(): string | null {
  const wsUrl = getWebSocketUrl();
  if (!wsUrl) return null;
  return wsUrl.replace(/^ws/, "http");
}
