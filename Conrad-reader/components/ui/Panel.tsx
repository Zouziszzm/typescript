import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  tag?: string;
};

export function Panel({ children, className = "", title, tag }: PanelProps) {
  return (
    <section className={`border border-border bg-bg-panel ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b border-border-light px-4 py-2">
          <span className="label-caps">{title}</span>
          {tag && <span className="tag">{tag}</span>}
        </header>
      )}
      {children}
    </section>
  );
}
