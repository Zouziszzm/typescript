import { neonAuth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type AppSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

/** Compatibility helper used across the app (replaces NextAuth `auth()`). */
export async function auth(): Promise<AppSession | null> {
  const { data: session } = await neonAuth.getSession();
  if (!session?.user?.id) return null;

  const email = session.user.email ?? `${session.user.id}@neon.local`;

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: session.user.name,
      image: session.user.image,
    },
    create: {
      id: session.user.id,
      email,
      name: session.user.name,
      image: session.user.image,
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
  };
}

export async function signOut() {
  await neonAuth.signOut();
  redirect("/");
}

export { neonAuth };
