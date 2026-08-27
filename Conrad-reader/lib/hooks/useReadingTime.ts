"use client";

import { useEffect, useRef } from "react";
import { addReadingMinutes } from "@/lib/db/index";

export function useReadingTime(active: boolean) {
  const startRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    startRef.current = Date.now();

    const onVisibility = () => {
      if (document.hidden) {
        if (startRef.current) {
          accumulatedRef.current += Date.now() - startRef.current;
          startRef.current = null;
        }
      } else {
        startRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);

      if (startRef.current) {
        accumulatedRef.current += Date.now() - startRef.current;
      }

      const minutes = Math.round(accumulatedRef.current / 60000);
      if (minutes > 0) {
        addReadingMinutes(minutes);
      }
    };
  }, [active]);
}
