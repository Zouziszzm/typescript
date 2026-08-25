import { auth } from "@/auth";
import { GuestRoom } from "@/components/GuestRoom";
import { RoomGame } from "@/components/RoomGame";
import { prisma } from "@/lib/prisma";
import type { GameMode, PlayerCount } from "@key-warriors/shared";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    mode?: string;
    modeValue?: string;
    maxPlayers?: string;
    create?: string;
  }>;
};

function parseLobbyQuery(query: {
  mode?: string;
  modeValue?: string;
  maxPlayers?: string;
  create?: string;
}) {
  const mode = (query.mode as GameMode | undefined) ?? "words";
  const parsedModeValue = query.modeValue ? Number(query.modeValue) : 25;
  const modeValue =
    mode === "quote" || mode === "custom" || Number.isNaN(parsedModeValue)
      ? null
      : parsedModeValue;
  const parsedMaxPlayers = query.maxPlayers ? Number(query.maxPlayers) : 3;
  const maxPlayers: PlayerCount = parsedMaxPlayers === 2 ? 2 : 3;
  const isCreator = query.create === "1";
  return { mode, modeValue, maxPlayers, isCreator };
}

export default async function RoomPage({ params, searchParams }: Props) {
  const session = await auth();
  const { code } = await params;
  const query = await searchParams;
  const roomCode = code.toUpperCase();
  const { mode, modeValue, maxPlayers, isCreator } = parseLobbyQuery(query);

  if (!session?.user?.id) {
    return (
      <GuestRoom
        code={roomCode}
        initialMode={mode}
        initialModeValue={modeValue}
        initialMaxPlayers={maxPlayers}
        isCreator={isCreator}
      />
    );
  }

  const room = await prisma.room.findUnique({
    where: { code: roomCode },
  });

  const hostIsCreator =
    isCreator || (room != null && room.hostId === session.user.id);

  if (!room) {
    return (
      <RoomGame
        code={roomCode}
        userId={session.user.id}
        name={session.user.name ?? session.user.email ?? "Player"}
        image={session.user.image}
        initialMode={mode}
        initialModeValue={modeValue}
        initialMaxPlayers={maxPlayers}
        isCreator={isCreator}
      />
    );
  }

  return (
    <RoomGame
      code={room.code}
      userId={session.user.id}
      name={session.user.name ?? session.user.email ?? "Player"}
      image={session.user.image}
      initialMode={room.mode as GameMode}
      initialModeValue={room.modeValue}
      initialMaxPlayers={maxPlayers}
      isCreator={hostIsCreator}
    />
  );
}
