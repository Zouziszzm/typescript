"use client";

import { useEffect, useState } from "react";
import {
  TIME_OPTIONS,
  WORD_OPTIONS,
  type GameMode,
} from "@key-warriors/shared";
import { TypingEngine } from "@/components/TypingEngine";
import { LabeledSelect } from "@/components/LabeledSelect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MODE_OPTIONS = [
  { value: "words", label: "Words" },
  { value: "time", label: "Time" },
  { value: "quote", label: "Quote" },
  { value: "custom", label: "Custom" },
];

export default function PracticePage() {
  const [mode, setMode] = useState<GameMode>("words");
  const [modeValue, setModeValue] = useState(25);
  const [hardcore, setHardcore] = useState(false);
  const [customText, setCustomText] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastStats, setLastStats] = useState<{
    wpm: number;
    accuracy: number;
  } | null>(null);

  const generate = async () => {
    setLoading(true);
    setLastStats(null);
    try {
      const res = await fetch("/api/texts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          modeValue: mode === "quote" || mode === "custom" ? null : modeValue,
          customText: mode === "custom" ? customText : null,
        }),
      });
      if (res.status === 401) {
        const eng = await fetch("/texts/english.json").then((r) => r.json());
        const count = mode === "words" ? modeValue : 50;
        const picked: string[] = [];
        for (let i = 0; i < count; i++) {
          picked.push(eng[Math.floor(Math.random() * eng.length)]);
        }
        setWords(picked);
        return;
      }
      const data = await res.json();
      setWords(data.words ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solo practice</h1>
        <p className="text-sm text-zinc-400">
          Warm up alone before jumping into a warrior room.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <LabeledSelect
          label="Mode"
          value={mode}
          onValueChange={(value) => {
            const m = value as GameMode;
            setMode(m);
            setModeValue(m === "time" ? 60 : 25);
          }}
          options={MODE_OPTIONS}
          triggerClassName="min-w-[140px]"
        />

        {mode === "time" && (
          <LabeledSelect
            label="Duration"
            value={String(modeValue)}
            onValueChange={(value) => setModeValue(Number(value))}
            options={TIME_OPTIONS.map((t) => ({
              value: String(t),
              label: `${t}s`,
            }))}
            triggerClassName="min-w-[100px]"
          />
        )}

        {mode === "words" && (
          <LabeledSelect
            label="Words"
            value={String(modeValue)}
            onValueChange={(value) => setModeValue(Number(value))}
            options={WORD_OPTIONS.map((w) => ({
              value: String(w),
              label: `${w} words`,
            }))}
            triggerClassName="min-w-[120px]"
          />
        )}

        <Button type="button" disabled={loading} onClick={() => void generate()}>
          New text
        </Button>

        <div className="flex items-center gap-2 pb-0.5">
          <Checkbox
            id="practice-hardcore"
            checked={hardcore}
            onCheckedChange={(checked) => setHardcore(checked === true)}
          />
          <Label htmlFor="practice-hardcore" className="text-zinc-400">
            Hardcore (no backspace)
          </Label>
        </div>
      </div>

      {mode === "custom" && (
        <Textarea
          rows={3}
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Paste custom text…"
        />
      )}

      {words.length > 0 && (
        <TypingEngine
          key={`${words.join(" ")}-${hardcore}`}
          words={words}
          mode={mode}
          modeValue={mode === "quote" || mode === "custom" ? null : modeValue}
          hardcore={hardcore}
          onComplete={(s) =>
            setLastStats({ wpm: s.wpm, accuracy: s.accuracy })
          }
        />
      )}

      {lastStats && (
        <p className="text-emerald-300">
          Result: {Math.round(lastStats.wpm)} WPM ·{" "}
          {Math.round(lastStats.accuracy)}% accuracy
        </p>
      )}
    </div>
  );
}
