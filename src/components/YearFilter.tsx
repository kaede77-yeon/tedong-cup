import Link from "next/link";

/** 연도 필터 칩 (서버 렌더링, 쿼리스트링 기반) */
export function YearFilter({ years, current, basePath }: { years: number[]; current?: number; basePath: string }) {
  if (years.length === 0) return null;
  const chip = (label: string, href: string, active: boolean) => (
    <Link
      key={label}
      href={href}
      className={`flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 text-sm font-bold ${
        active ? "border-court bg-court text-white" : "border-ink/15 bg-white"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3">
      {chip("전체", basePath, current === undefined)}
      {years.map((y) => chip(`${y}년`, `${basePath}?year=${y}`, current === y))}
    </div>
  );
}
