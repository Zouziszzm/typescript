import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matches = await prisma.matchPlayer.findMany({
    where: { userId: session.user.id },
    orderBy: { match: { createdAt: "desc" } },
    take: 50,
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
    matches: matches.map((mp) => ({
      matchId: mp.matchId,
      mode: mp.match.mode,
      modeValue: mp.match.modeValue,
      teamWpm: mp.match.teamWpm,
      teamAccuracy: mp.match.teamAccuracy,
      durationMs: mp.match.durationMs,
      createdAt: mp.match.createdAt,
      myStats: {
        seat: mp.seat,
        wpm: mp.wpm,
        accuracy: mp.accuracy,
        correctChars: mp.correctChars,
        incorrectChars: mp.incorrectChars,
        completedWords: mp.completedWords,
      },
      players: mp.match.players.map((p) => ({
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
