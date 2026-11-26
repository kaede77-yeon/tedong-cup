import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-court text-white active:bg-court/90 disabled:bg-gray-300 disabled:text-gray-500",
  secondary: "bg-white text-ink border-2 border-ink/15 active:bg-gray-100 disabled:text-gray-400",
  danger: "bg-red-700 text-white active:bg-red-800 disabled:bg-gray-300",
  ghost: "bg-transparent text-court active:bg-court-light",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-1 rounded-xl px-4 text-base font-bold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="px-4 pt-5 pb-3">
      <h1 className="text-2xl font-extrabold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm font-medium text-muted">{sub}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border-2 border-ink/10 bg-white ${className}`}>{children}</div>;
}

export function StatusBadge({ status }: { status: "IN_PROGRESS" | "COMPLETED" }) {
  return status === "IN_PROGRESS" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-ball px-2.5 py-0.5 text-xs font-extrabold text-ink">
      <span className="size-2 animate-pulse rounded-full bg-red-600" /> 진행중
    </span>
  ) : (
    <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-bold text-gray-700">종료</span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-16 text-center text-base font-medium text-muted">{children}</p>;
}

export function Loading() {
  return (
    <div className="flex justify-center py-16" role="status" aria-label="불러오는 중">
      <span className="size-8 animate-spin rounded-full border-4 border-court/20 border-t-court" />
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
