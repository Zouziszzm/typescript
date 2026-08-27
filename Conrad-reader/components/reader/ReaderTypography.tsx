"use client";

import type { ReadingMode } from "@/lib/theme";

type ReaderTypographyProps = {
  fontSize: number;
  lineHeight: number;
  margin: number;
  readingMode: ReadingMode;
  children: React.ReactNode;
  className?: string;
};

const modeClasses: Record<ReadingMode, string> = {
  scroll: "reader-mode-scroll",
  paginated: "reader-mode-paginated",
  "scroll-strip": "reader-mode-strip",
};

export function ReaderTypography({
  fontSize,
  lineHeight,
  margin,
  readingMode,
  children,
  className = "",
}: ReaderTypographyProps) {
  return (
    <div
      className={`reader-typography ${modeClasses[readingMode]} ${className}`}
      style={
        {
          "--reader-font-size": `${fontSize}px`,
          "--reader-line-height": lineHeight,
          "--reader-margin": `${margin}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
