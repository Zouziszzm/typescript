"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_DARK_SCHEDULE,
  resolveAutoTheme,
  type DarkSchedule,
  type FontId,
  type GridId,
  type ReadingMode,
  type ThemeMode,
} from "@/lib/theme";

type AppSettings = {
  theme: ThemeMode;
  font: FontId;
  grid: GridId;
  readingMode: ReadingMode;
  fontSize: number;
  lineHeight: number;
  margin: number;
  darkSchedule: DarkSchedule;
};

type SettingsContextValue = AppSettings & {
  setTheme: (theme: ThemeMode) => void;
  setFont: (font: FontId) => void;
  setGrid: (grid: GridId) => void;
  setReadingMode: (mode: ReadingMode) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setMargin: (margin: number) => void;
  setDarkSchedule: (schedule: DarkSchedule) => void;
};

const STORAGE_KEY = "reader-settings";

const defaults: AppSettings = {
  theme: "paper",
  font: "jetbrains",
  grid: "on",
  readingMode: "scroll",
  fontSize: 16,
  lineHeight: 1.7,
  margin: 32,
  darkSchedule: DEFAULT_DARK_SCHEDULE,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function applyTheme(theme: ThemeMode, schedule: DarkSchedule) {
  const root = document.documentElement;
  if (theme === "auto") {
    root.setAttribute("data-theme", resolveAutoTheme(schedule));
  } else {
    root.setAttribute("data-theme", theme);
  }
}

function applyFont(font: FontId) {
  const map: Record<FontId, string> = {
    jetbrains: "var(--font-jetbrains-mono)",
    geist: "var(--font-geist-mono)",
    ibm: "var(--font-ibm-plex-mono)",
    space: "var(--font-space-mono)",
  };
  document.body.style.fontFamily = `${map[font]}, ui-monospace, monospace`;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaults);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    applyTheme(loaded.theme, loaded.darkSchedule);
    applyFont(loaded.font);
  }, []);

  useEffect(() => {
    if (settings.theme !== "auto") return;
    const tick = () => applyTheme("auto", settings.darkSchedule);
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [settings.theme, settings.darkSchedule]);

  const persist = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      applyTheme(next.theme, next.darkSchedule);
      applyFont(next.font);
      return next;
    });
  }, []);

  const setTheme = useCallback(
    (theme: ThemeMode) => persist({ theme }),
    [persist],
  );
  const setFont = useCallback((font: FontId) => persist({ font }), [persist]);
  const setGrid = useCallback((grid: GridId) => persist({ grid }), [persist]);
  const setReadingMode = useCallback(
    (readingMode: ReadingMode) => persist({ readingMode }),
    [persist],
  );
  const setFontSize = useCallback(
    (fontSize: number) => persist({ fontSize }),
    [persist],
  );
  const setLineHeight = useCallback(
    (lineHeight: number) => persist({ lineHeight }),
    [persist],
  );
  const setMargin = useCallback(
    (margin: number) => persist({ margin }),
    [persist],
  );
  const setDarkSchedule = useCallback(
    (darkSchedule: DarkSchedule) => persist({ darkSchedule }),
    [persist],
  );

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setTheme,
        setFont,
        setGrid,
        setReadingMode,
        setFontSize,
        setLineHeight,
        setMargin,
        setDarkSchedule,
      }}
    >
      <div
        aria-hidden
        className={`app-bg ${settings.grid === "on" ? "grid-on" : ""}`}
      />
      <div className="app-root">{children}</div>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
