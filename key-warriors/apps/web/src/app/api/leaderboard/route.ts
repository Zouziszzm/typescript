import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? undefined;
  const modeValueParam = searchParams.get("modeValue");
  const modeValue = modeValueParam ? Number(modeValueParam) : undefined;
  const playerCountParam = searchParams.get("playerCount");
  const playerCount = playerCountParam ? Number(playerCountParam) : undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const entries = await prisma.leaderboardEntry.findMany({
    where: {
      ...(mode ? { mode } : {}),
      ...(modeValue !== undefined && !Number.isNaN(modeValue)
        ? { modeValue }
        : {}),
      ...(playerCount !== undefined && !Number.isNaN(playerCount)
        ? { playerCount }
        : {}),
    },
    orderBy: { teamWpm: "desc" },
    take: limit,
    include: {
      match: {
        include: {
          players: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
            orderBy: { seat: "asc" },
          },
        },
      },
    },
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      mode: e.mode,
      modeValue: e.modeValue,
      teamWpm: e.teamWpm,
      teamAccuracy: e.teamAccuracy,
      playerCount: e.playerCount,
      createdAt: e.createdAt,
      players: e.match.players.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        image: p.user.image,
        seat: p.seat,
        wpm: p.wpm,
        accuracy: p.accuracy,
      })),
    })),
  });
}
