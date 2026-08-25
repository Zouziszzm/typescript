import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import type { MatchResult, ServerMessage } from "@key-warriors/shared";
import { shouldPersistMatch } from "@key-warriors/shared";
import { listConnectionsForRoom } from "./dynamo.js";

export function createApiClient(endpoint: string) {
  return new ApiGatewayManagementApiClient({ endpoint });
}

export async function sendToConnection(
  api: ApiGatewayManagementApiClient,
  connectionId: string,
  message: ServerMessage
) {
  await api.send(
    new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(message)),
    })
  );
}

export async function broadcastRoom(
  api: ApiGatewayManagementApiClient,
  roomId: string,
  message: ServerMessage,
  excludeConnectionId?: string
) {
  const connections = await listConnectionsForRoom(roomId);
  await Promise.all(
    connections.map(async (c) => {
      if (c.connectionId === excludeConnectionId) return;
      try {
        await sendToConnection(api, c.connectionId, message);
      } catch {
        // Stale connection — ignore
      }
    })
  );
}

export async function persistMatchResult(result: unknown) {
  const webhook = process.env.VERCEL_WEBHOOK_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!webhook || !secret) return;

  const match = result as MatchResult;
  if (
    !match?.players?.length ||
    !shouldPersistMatch(match.players.map((p) => p.userId))
  ) {
    return;
  }

  await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": secret,
    },
    body: JSON.stringify(result),
  });
}
