"use client";

type TabBarProps<T extends string> = {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
};

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: TabBarProps<T>) {
  return (
    <div className="flex border-b border-border-light">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`label-caps flex-1 border-r border-border-light px-3 py-2 last:border-r-0 transition-colors ${
            active === tab.id
              ? "bg-bg-overlay text-fg"
              : "text-fg-muted hover:bg-bg-panel-hover hover:text-fg"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
