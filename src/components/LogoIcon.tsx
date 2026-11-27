/**
 * 앱 로고: 인디고 배지 위 테니스 라켓 + 공 (SVG).
 * 라켓은 primary-fg, 공은 테니스공 색(라이트/다크 공통)으로 그린다.
 */
export function LogoIcon({ className = "" }: { className?: string }) {
  return (
    <span
      className={`grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg shadow-sm shadow-primary/30 ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="size-[26px]" fill="none">
        <defs>
          <clipPath id="logo-racket-head">
            <ellipse cx="13" cy="12" rx="6.2" ry="8.2" transform="rotate(-40 13 12)" />
          </clipPath>
        </defs>
        {/* 라켓 줄 */}
        <g clipPath="url(#logo-racket-head)" stroke="currentColor" strokeWidth="0.7" opacity="0.75">
          {[4, 6.5, 9, 11.5, 14, 16.5, 19, 21.5].map((p) => (
            <g key={p}>
              <line x1={p} y1="0" x2={p} y2="26" transform="rotate(-40 13 12)" />
              <line x1="0" y1={p - 1} x2="26" y2={p - 1} transform="rotate(-40 13 12)" />
            </g>
          ))}
        </g>
        {/* 라켓 프레임 */}
        <ellipse
          cx="13"
          cy="12"
          rx="6.2"
          ry="8.2"
          transform="rotate(-40 13 12)"
          stroke="currentColor"
          strokeWidth="2"
        />
        {/* 목 + 손잡이 */}
        <path d="M17.2 17.6 L20.2 20.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20.2 20.6 L26.6 27" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
        {/* 테니스공 */}
        <circle cx="24.2" cy="8.2" r="4.6" fill="#D9F24A" stroke="#1E1B4B" strokeWidth="0.6" />
        <path
          d="M20.6 6.2 C22.6 7.2 22.6 9.6 20.9 11.1 M27.8 5.3 C25.9 6.6 25.9 9.4 27.6 10.9"
          stroke="#FFFFFF"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
