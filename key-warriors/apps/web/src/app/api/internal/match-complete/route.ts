import { NextResponse } from "next/server";
import { MatchResultSchema, shouldPersistMatch } from "@key-warriors/shared";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = MatchResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = parsed.data;

  if (!shouldPersistMatch(result.players.map((p) => p.userId))) {
    return NextResponse.json({ skipped: true, reason: "guest_match" });
  }

  const room = await prisma.room.findFirst({
    where: { OR: [{ id: result.roomId }, { code: result.roomId }] },
  });

  const match = await prisma.match.create({
    data: {
      roomId: room?.id,
      mode: result.mode,
      modeValue: result.modeValue,
      sourceText: result.sourceText,
      teamWpm: result.teamWpm,
      teamAccuracy: result.teamAccuracy,
      durationMs: result.durationMs,
      players: {
        create: result.players.map((p) => ({
          userId: p.userId,
          seat: p.seat,
          wpm: p.wpm,
          accuracy: p.accuracy,
          correctChars: p.correctChars,
          incorrectChars: p.incorrectChars,
          completedWords: p.completedWords,
        })),
      },
      leaderboard: {
        create: {
          mode: result.mode,
          modeValue: result.modeValue,
          teamWpm: result.teamWpm,
          teamAccuracy: result.teamAccuracy,
          playerCount: result.players.length,
        },
      },
    },
    include: { players: true, leaderboard: true },
  });

  if (room) {
    await prisma.room.update({
      where: { id: room.id },
      data: { status: "finished" },
    });
  }

  return NextResponse.json({ matchId: match.id });
}
