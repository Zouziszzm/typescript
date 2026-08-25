import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function Nav() {
  const session = await auth();

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-zinc-100">
          Keyboard<span className="text-amber-400">Warriors</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-zinc-400">
          <Link href="/play" className="hover:text-zinc-100">
            Play
          </Link>
          <Link href="/practice" className="hover:text-zinc-100">
            Practice
          </Link>
          <Link href="/leaderboard" className="hover:text-zinc-100">
            Leaderboard
          </Link>
          {session?.user ? (
            <>
              <Link href="/history" className="hover:text-zinc-100">
                History
              </Link>
              <span className="hidden text-zinc-500 sm:inline">
                {session.user.name ?? session.user.email}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border border-zinc-700 px-2 py-1 hover:border-zinc-500 hover:text-zinc-100"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth/sign-in"
              className="rounded-md bg-amber-500 px-3 py-1.5 font-medium text-zinc-950 hover:bg-amber-400"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
