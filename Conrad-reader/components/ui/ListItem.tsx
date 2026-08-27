import type { ReactNode } from "react";

type ListItemProps = {
  symbol?: string;
  label: string;
  tag?: string;
  action?: ReactNode;
  onClick?: () => void;
  active?: boolean;
};

export function ListItem({
  symbol = "+",
  label,
  tag,
  action,
  onClick,
  active,
}: ListItemProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full min-h-11 touch-manipulation items-center gap-3 border-b border-border-light px-4 py-2.5 text-left transition-colors last:border-b-0 ${
        onClick ? "hover:bg-bg-panel-hover cursor-pointer" : ""
      } ${active ? "bg-bg-overlay" : ""}`}
    >
      <span className="symbol w-3 shrink-0 text-center">{symbol}</span>
      <span className="flex-1 truncate">{label}</span>
      {tag && <span className="tag shrink-0">{tag}</span>}
      {action && <span className="symbol shrink-0">{action}</span>}
    </Tag>
  );
}
