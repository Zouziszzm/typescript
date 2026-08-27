"use client";

import { useState } from "react";
import { TabBar } from "@/components/ui/TabBar";
import { ListItem } from "@/components/ui/ListItem";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/app/providers";
import { exportAllData } from "@/lib/db/index";
import {
  FONT_OPTIONS,
  GRID_OPTIONS,
  READING_MODES,
  THEME_MODES,
  type FontId,
  type GridId,
  type ReadingMode,
  type ThemeMode,
} from "@/lib/theme";

type SettingsTab = "fonts" | "theme" | "grid" | "reading" | "data";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "fonts", label: "FONTS" },
  { id: "theme", label: "THEME" },
  { id: "grid", label: "GRID" },
  { id: "reading", label: "READ" },
  { id: "data", label: "DATA" },
];

export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>("theme");
  const {
    theme,
    font,
    grid,
    readingMode,
    fontSize,
    lineHeight,
    margin,
    darkSchedule,
    setTheme,
    setFont,
    setGrid,
    setReadingMode,
    setFontSize,
    setLineHeight,
    setMargin,
    setDarkSchedule,
  } = useSettings();

  const exportData = async () => {
    const json = await exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reader-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 pb-8">
      <section>
        <p className="label-caps mb-1">SETTINGS</p>
        <p className="text-fg-muted">
          Configure appearance and reading defaults.
        </p>
      </section>

      <Panel className="overflow-hidden">
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === "fonts" && (
          <div>
            {FONT_OPTIONS.map((f) => (
              <ListItem
                key={f.id}
                label={f.label}
                tag={f.tag}
                action={font === f.id ? "▾" : "→"}
                active={font === f.id}
                onClick={() => setFont(f.id as FontId)}
              />
            ))}
          </div>
        )}

        {tab === "theme" && (
          <div>
            {THEME_MODES.map((t) => (
              <ListItem
                key={t.id}
                label={t.label}
                tag={t.tag}
                action={theme === t.id ? "▾" : "→"}
                active={theme === t.id}
                onClick={() => setTheme(t.id as ThemeMode)}
              />
            ))}
            <ListItem
              label={`SCHEDULE ${darkSchedule.enabled ? "ON" : "OFF"}`}
              tag="[AUTO]"
              action={darkSchedule.enabled ? "▾" : "→"}
              onClick={() =>
                setDarkSchedule({
                  ...darkSchedule,
                  enabled: !darkSchedule.enabled,
                })
              }
            />
            <div className="flex gap-2 border-b border-border-light px-4 py-2">
              <label className="tag flex items-center gap-2">
                START
                <input
                  type="time"
                  value={darkSchedule.start}
                  onChange={(e) =>
                    setDarkSchedule({ ...darkSchedule, start: e.target.value })
                  }
                  className="border border-border bg-bg px-2 py-1"
                />
              </label>
              <label className="tag flex items-center gap-2">
                END
                <input
                  type="time"
                  value={darkSchedule.end}
                  onChange={(e) =>
                    setDarkSchedule({ ...darkSchedule, end: e.target.value })
                  }
                  className="border border-border bg-bg px-2 py-1"
                />
              </label>
            </div>
          </div>
        )}

        {tab === "grid" && (
          <div>
            {GRID_OPTIONS.map((g) => (
              <ListItem
                key={g.id}
                label={g.label}
                tag="[BG]"
                action={grid === g.id ? "▾" : "→"}
                active={grid === g.id}
                onClick={() => setGrid(g.id as GridId)}
              />
            ))}
          </div>
        )}

        {tab === "reading" && (
          <div>
            {READING_MODES.map((m) => (
              <ListItem
                key={m.id}
                label={m.label}
                tag="[DEFAULT]"
                action={readingMode === m.id ? "▾" : "→"}
                active={readingMode === m.id}
                onClick={() => setReadingMode(m.id as ReadingMode)}
              />
            ))}
            <ListItem label={`FONT SIZE — ${fontSize}px`} tag="[SIZE]" symbol="+" />
            <div className="flex flex-wrap gap-2 border-b border-border-light px-4 py-2">
              {[14, 16, 18, 20, 24].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFontSize(size)}
                  className={`label-caps border border-border px-3 py-1 ${
                    fontSize === size ? "bg-bg-overlay" : "hover:bg-bg-panel-hover"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <ListItem label={`LINE HEIGHT — ${lineHeight}`} tag="[LH]" symbol="+" />
            <div className="flex flex-wrap gap-2 border-b border-border-light px-4 py-2">
              {[1.4, 1.6, 1.8, 2.0].map((lh) => (
                <button
                  key={lh}
                  type="button"
                  onClick={() => setLineHeight(lh)}
                  className={`label-caps border border-border px-3 py-1 ${
                    lineHeight === lh ? "bg-bg-overlay" : "hover:bg-bg-panel-hover"
                  }`}
                >
                  {lh}
                </button>
              ))}
            </div>
            <ListItem label={`MARGIN — ${margin}px`} tag="[MG]" symbol="+" />
            <div className="flex flex-wrap gap-2 px-4 py-2">
              {[16, 24, 32, 48, 64].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMargin(m)}
                  className={`label-caps border border-border px-3 py-1 ${
                    margin === m ? "bg-bg-overlay" : "hover:bg-bg-panel-hover"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "data" && (
          <div className="px-4 py-6">
            <p className="mb-4 text-fg-muted">
              Export reading history, progress, bookmarks, and highlights as
              JSON. Book files are not included.
            </p>
            <Button symbol="→" onClick={exportData}>
              EXPORT DATA
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
