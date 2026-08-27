"use client";

import { useEffect, useRef, useState } from "react";
import {
  dictionarySearchUrl,
  lookupWord,
  type DictionaryResult,
} from "@/lib/reading/dictionary";
import type { WordLookupAnchor } from "@/lib/reading/dictionary";

type DictionaryPopupProps = {
  word: string | null;
  anchor: WordLookupAnchor | null;
  onClose: () => void;
};

export function DictionaryPopup({ word, anchor, onClose }: DictionaryPopupProps) {
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  useEffect(() => {
    if (!word) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setResult(null);

    void lookupWord(word)
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load definition",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [word]);

  useEffect(() => {
    if (!anchor || !popupRef.current) {
      setPosition(null);
      return;
    }

    const place = () => {
      const el = popupRef.current;
      if (!el || !anchor) return;

      const margin = 12;
      const rect = el.getBoundingClientRect();
      let left = anchor.x - rect.width / 2;
      let top = anchor.y - rect.height - margin;

      if (top < margin) {
        top = anchor.y + margin;
      }

      left = Math.max(
        margin,
        Math.min(left, window.innerWidth - rect.width - margin),
      );
      top = Math.max(
        margin,
        Math.min(top, window.innerHeight - rect.height - margin),
      );

      setPosition({ left, top });
    };

    place();
    const ro = new ResizeObserver(place);
    ro.observe(popupRef.current);
    return () => ro.disconnect();
  }, [anchor, word, result, error, loading]);

  useEffect(() => {
    if (!word) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [word, onClose]);

  if (!word || !anchor) return null;

  const searchUrl = result?.searchUrl ?? dictionarySearchUrl(word);

  return (
    <>
      <button
        type="button"
        className="dict-backdrop"
        aria-label="Close definition"
        onClick={onClose}
      />
      <div
        ref={popupRef}
        className="dict-popup"
        role="dialog"
        aria-label={`Definition of ${word}`}
        style={
          position
            ? { left: position.left, top: position.top, visibility: "visible" }
            : { left: anchor.x, top: anchor.y, visibility: "hidden" }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dict-popup-header">
          <div className="min-w-0 flex-1">
            <p className="dict-popup-word">{result?.word ?? word}</p>
            {result?.phonetic ? (
              <p className="dict-popup-phonetic">/{result.phonetic}/</p>
            ) : null}
          </div>
          <button
            type="button"
            className="dict-popup-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="dict-popup-body">
          {loading ? (
            <p className="dict-popup-muted">Looking up…</p>
          ) : error ? (
            <p className="dict-popup-muted">{error}</p>
          ) : result ? (
            <div className="dict-popup-meanings">
              {result.meanings.map((meaning) => (
                <div key={meaning.partOfSpeech} className="dict-popup-meaning">
                  <p className="dict-popup-pos">{meaning.partOfSpeech}</p>
                  <ul>
                    {meaning.definitions.map((def) => (
                      <li key={def}>{def}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="dict-popup-footer">
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dict-popup-search"
          >
            Search “{word}” online →
          </a>
        </div>
      </div>
    </>
  );
}
