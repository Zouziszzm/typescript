/**
 * In-memory room store for local development WebSocket server.
 */
import type { ConnectionRecord, RoomRecord } from "./game-engine.js";

const rooms = new Map<string, RoomRecord>();
const roomsByCode = new Map<string, string>();
const connections = new Map<string, ConnectionRecord>();

export const memoryStore = {
  putRoom(room: RoomRecord) {
    rooms.set(room.roomId, room);
    roomsByCode.set(room.code.toUpperCase(), room.roomId);
  },
  getRoom(roomId: string) {
    return rooms.get(roomId) ?? null;
  },
  getRoomByCode(code: string) {
    const id = roomsByCode.get(code.toUpperCase());
    return id ? rooms.get(id) ?? null : null;
  },
  putConnection(conn: ConnectionRecord) {
    connections.set(conn.connectionId, conn);
  },
  getConnection(connectionId: string) {
    return connections.get(connectionId) ?? null;
  },
  deleteConnection(connectionId: string) {
    connections.delete(connectionId);
  },
  listConnectionsForRoom(roomId: string) {
    return [...connections.values()].filter((c) => c.roomId === roomId);
  },
};
