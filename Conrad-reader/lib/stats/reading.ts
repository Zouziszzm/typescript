import type { SessionStats } from "@/lib/db/types";

export function getReadingStreak(stats: SessionStats[]): number {
  const days = new Set(
    stats.filter((s) => s.minutes > 0).map((s) => s.date),
  );
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();

  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function estimateMinutesLeft(
  percent: number,
  totalMinutesRead: number,
): number | null {
  if (percent <= 0 || percent >= 100) return null;
  const remaining = (100 - percent) / percent;
  return Math.round(totalMinutesRead * remaining);
}

export function formatEta(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `~${minutes}m left`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m left` : `~${h}h left`;
}
