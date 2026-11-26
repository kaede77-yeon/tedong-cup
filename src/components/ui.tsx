import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-fg shadow-sm shadow-primary/25 hover:bg-primary-hover disabled:bg-subtle disabled:text-faint disabled:shadow-none",
  secondary: "border border-line-strong bg-surface text-ink shadow-xs hover:bg-subtle disabled:text-faint",
  danger: "bg-danger text-white shadow-sm shadow-danger/25 hover:opacity-90 disabled:bg-subtle disabled:text-faint",
  ghost: "bg-transparent text-primary-text hover:bg-primary-soft",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-4 text-[15px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-xs ${className}`}>{children}</div>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-4 pt-6 pb-2">
      <h2 className="text-base font-semibold">{children}</h2>
      {aside && <span className="text-xs text-muted">{aside}</span>}
    </div>
  );
}

export function StatusBadge({ status }: { status: "IN_PROGRESS" | "COMPLETED" }) {
  return status === "IN_PROGRESS" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-text">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
      </span>
      진행중
    </span>
  ) : (
    <span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-muted">종료</span>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "muted" | "warning" | "danger"; children: ReactNode }) {
  const tones = {
    info: "bg-primary-soft text-primary-text",
    muted: "bg-subtle text-muted",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  };
  return <p className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ${tones[tone]}`}>{children}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-20 text-center text-sm text-muted">{children}</p>;
}

export function Loading() {
  return (
    <div className="flex justify-center py-20" role="status" aria-label="불러오는 중">
      <span className="size-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
    </div>
  );
}

export function rankLabel(rank: number, tied: boolean) {
  return tied ? `공동${rank}` : String(rank);
}

export function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dow = "일월화수목금토"[new Date(y, m - 1, d).getDay()];
  return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} (${dow})`;
}
