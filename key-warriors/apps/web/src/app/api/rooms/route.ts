import { NextResponse } from "next/server";
import { z } from "zod";
import { generateRoomCode, GameModeSchema, MAX_PLAYERS } from "@key-warriors/shared";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const CreateRoomSchema = z.object({
  mode: GameModeSchema.default("words"),
  modeValue: z.number().int().positive().nullable().optional(),
  maxPlayers: z.union([z.literal(2), z.literal(3)]).default(3),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const mode = parsed.data.mode;
  const modeValue =
    parsed.data.modeValue ??
    (mode === "time" ? 60 : mode === "words" ? 25 : null);

  let code = generateRoomCode();
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.room.findUnique({ where: { code } });
    if (!existing) break;
    code = generateRoomCode();
  }

  const room = await prisma.room.create({
    data: {
      code,
      hostId: session.user.id,
      status: "lobby",
      mode,
      modeValue,
    },
  });

  return NextResponse.json({
    id: room.id,
    code: room.code,
    mode: room.mode,
    modeValue: room.modeValue,
    maxPlayers: parsed.data.maxPlayers ?? MAX_PLAYERS,
  });
}
