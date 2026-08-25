"use client";

import Link from "next/link";
import { useState } from "react";
import type { GameMode, PlayerCount } from "@key-warriors/shared";
import { RoomGame } from "@/components/RoomGame";
import { getGuestProfile } from "@/lib/guest";

type GuestRoomProps = {
  code: string;
  initialMode?: GameMode;
  initialModeValue?: number | null;
  initialMaxPlayers?: PlayerCount;
  isCreator?: boolean;
};

export function GuestRoom({
  code,
  initialMode = "words",
  initialModeValue = 25,
  initialMaxPlayers = 3,
  isCreator = false,
}: GuestRoomProps) {
  const [profile] = useState(() => getGuestProfile());

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Playing as <span className="text-zinc-300">{profile.name}</span> (guest
        — nothing is saved).{" "}
        <Link href="/auth/sign-in" className="text-amber-400 hover:underline">
          Sign in
        </Link>{" "}
        to keep match history.
      </p>
      <RoomGame
        code={code}
        userId={profile.id}
        name={profile.name}
        initialMode={initialMode}
        initialModeValue={initialModeValue}
        initialMaxPlayers={initialMaxPlayers}
        isCreator={isCreator}
      />
    </div>
  );
}
