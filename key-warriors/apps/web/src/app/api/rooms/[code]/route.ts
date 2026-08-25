import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      host: { select: { id: true, name: true, image: true } },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: room.id,
    code: room.code,
    status: room.status,
    mode: room.mode,
    modeValue: room.modeValue,
    host: room.host,
  });
}
