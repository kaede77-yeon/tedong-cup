import Link from "next/link";

/** 연도 필터 칩 (서버 렌더링, 쿼리스트링 기반) */
export function YearFilter({ years, current, basePath }: { years: number[]; current?: number; basePath: string }) {
  if (years.length === 0) return null;
  const chip = (label: string, href: string, active: boolean) => (
    <Link key={label} href={href} className={`chip shrink-0 ${active ? "chip-on" : ""}`} aria-current={active ? "page" : undefined}>
      {label}
    </Link>
  );
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-4">
      {chip("전체", basePath, current === undefined)}
      {years.map((y) => chip(`${y}년`, `${basePath}?year=${y}`, current === y))}
    </div>
  );
}
