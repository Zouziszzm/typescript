import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "default" | "key" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  symbol?: string;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  default:
    "border border-border bg-bg-panel px-4 py-2 hover:bg-bg-panel-hover active:bg-bg-overlay",
  key: "border border-border bg-bg-panel px-5 py-2 hover:bg-bg-panel-hover active:translate-y-px shadow-[0_2px_0_0_var(--border)] active:shadow-none",
  ghost:
    "px-2 py-1 text-fg-muted hover:text-fg hover:bg-bg-panel-hover",
};

export function Button({
  variant = "default",
  symbol,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`label-caps inline-flex items-center gap-2 transition-colors disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    >
      {symbol && <span className="symbol">{symbol}</span>}
      {children}
    </button>
  );
}
