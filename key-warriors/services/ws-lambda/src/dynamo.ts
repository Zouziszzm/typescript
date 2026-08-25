import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { ConnectionRecord, RoomRecord } from "./game-engine.js";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const ROOMS_TABLE = process.env.DYNAMODB_ROOMS_TABLE ?? "kw-rooms";
const CONNECTIONS_TABLE =
  process.env.DYNAMODB_CONNECTIONS_TABLE ?? "kw-connections";

export async function putRoom(room: RoomRecord) {
  await client.send(
    new PutCommand({
      TableName: ROOMS_TABLE,
      Item: room,
    })
  );
}

export async function getRoom(roomId: string): Promise<RoomRecord | null> {
  const res = await client.send(
    new GetCommand({
      TableName: ROOMS_TABLE,
      Key: { roomId },
    })
  );
  return (res.Item as RoomRecord) ?? null;
}

export async function getRoomByCode(code: string): Promise<RoomRecord | null> {
  const res = await client.send(
    new QueryCommand({
      TableName: ROOMS_TABLE,
      IndexName: "code-index",
      KeyConditionExpression: "#code = :code",
      ExpressionAttributeNames: { "#code": "code" },
      ExpressionAttributeValues: { ":code": code.toUpperCase() },
      Limit: 1,
    })
  );
  const item = res.Items?.[0];
  return (item as RoomRecord) ?? null;
}

/** Fallback when GSI is unavailable locally */
export async function findRoomByCodeScan(code: string): Promise<RoomRecord | null> {
  const res = await client.send(
    new ScanCommand({
      TableName: ROOMS_TABLE,
      FilterExpression: "#code = :code",
      ExpressionAttributeNames: { "#code": "code" },
      ExpressionAttributeValues: { ":code": code.toUpperCase() },
      Limit: 20,
    })
  );
  return (res.Items?.[0] as RoomRecord) ?? null;
}

export async function putConnection(conn: ConnectionRecord) {
  await client.send(
    new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: conn,
    })
  );
}

export async function getConnection(
  connectionId: string
): Promise<ConnectionRecord | null> {
  const res = await client.send(
    new GetCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
    })
  );
  return (res.Item as ConnectionRecord) ?? null;
}

export async function deleteConnection(connectionId: string) {
  await client.send(
    new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
    })
  );
}

export async function listConnectionsForRoom(
  roomId: string
): Promise<ConnectionRecord[]> {
  const res = await client.send(
    new QueryCommand({
      TableName: CONNECTIONS_TABLE,
      IndexName: "roomId-index",
      KeyConditionExpression: "roomId = :roomId",
      ExpressionAttributeValues: { ":roomId": roomId },
    })
  );
  return (res.Items as ConnectionRecord[]) ?? [];
}
