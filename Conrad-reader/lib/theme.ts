export type ThemeMode =
  | "paper"
  | "terminal"
  | "sepia"
  | "slate"
  | "auto";

export type ReadingMode = "scroll" | "paginated" | "scroll-strip";

export type SortKey = "title" | "author" | "added" | "progress";

export const THEME_MODES: { id: ThemeMode; label: string; tag: string }[] = [
  { id: "paper", label: "PAPER", tag: "[LIGHT]" },
  { id: "terminal", label: "TERMINAL", tag: "[DARK]" },
  { id: "sepia", label: "SEPIA", tag: "[WARM]" },
  { id: "slate", label: "SLATE", tag: "[COOL]" },
  { id: "auto", label: "AUTO", tag: "[SYS]" },
];

export const READING_MODES: { id: ReadingMode; label: string }[] = [
  { id: "scroll", label: "SCROLL" },
  { id: "paginated", label: "PAGINATED" },
  { id: "scroll-strip", label: "SCROLL STRIP" },
];

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "added", label: "DATE ADDED" },
  { id: "title", label: "TITLE" },
  { id: "author", label: "AUTHOR" },
  { id: "progress", label: "PROGRESS" },
];

export const FONT_OPTIONS = [
  { id: "jetbrains", label: "JetBrains Mono", tag: "[OFL]" },
  { id: "geist", label: "Geist Mono", tag: "[OFL]" },
  { id: "ibm", label: "IBM Plex Mono", tag: "[OFL]" },
  { id: "space", label: "Space Mono", tag: "[OFL]" },
] as const;

export type FontId = (typeof FONT_OPTIONS)[number]["id"];

export const GRID_OPTIONS = [
  { id: "on", label: "GRID ON" },
  { id: "off", label: "GRID OFF" },
] as const;

export type GridId = (typeof GRID_OPTIONS)[number]["id"];

export const APP_VERSION = "v0.1.0";

export type DarkSchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

export const DEFAULT_DARK_SCHEDULE: DarkSchedule = {
  enabled: true,
  start: "20:00",
  end: "07:00",
};

export function resolveAutoTheme(
  schedule: DarkSchedule,
): "paper" | "terminal" {
  if (!schedule.enabled) {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "terminal";
    }
    return "paper";
  }

  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = schedule.start.split(":").map(Number);
  const [eh, em] = schedule.end.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  if (start > end) {
    return mins >= start || mins < end ? "terminal" : "paper";
  }
  return mins >= start && mins < end ? "terminal" : "paper";
}
