# CLAUDE.md — 테동회 월례대회 운영 및 기록 관리 시스템

## 1. 프로젝트 개요
테니스 동호회 '테동회'의 월례대회 대진표 생성, 실시간 점수 기록, 개인별 순위 집계, 역대 수상자 및 누적 통계를 관리하는 **모바일 우선(Mobile-First) 웹 앱**입니다.

- **핵심 기획서:** `PRD.md`
- **대진표 매칭 규칙:** `경기매칭규칙.md` (구현 시 `src/data/hanulRules.json` 등으로 분리 관리)

---

## 2. 기술 스택 및 배포
- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS (모바일 우선, 야외 시인성을 고려한 고대비 UI)
- **Database:** MongoDB (MongoDB Atlas + Mongoose 또는 공식 Driver)
- **Hosting & CI/CD:** GitHub 연동 → Vercel 자동 배포

### 필수 환경 변수 (`.env.local` / Vercel Env)
- `MONGODB_URI`: MongoDB Atlas 연결 문자열
- `ADMIN_PASSWORD`: 관리자 인증용 비밀번호 (또는 시크릿 키)
- `SESSION_SECRET`: 관리자 세션 쿠키 HMAC 서명 키

---

## 3. 핵심 도메인 규칙 (절대 준수)

### 권한 분리
- **관리자(Admin):** 인증 후 회원 명부 관리, 대회/그룹 생성, 점수 입력/수정, 대회 종료 및 수상자 확정 가능.
- **일반 회원(Public):** 로그인 없이 URL 접속만으로 실시간 대진표/순위, 과거 대회 기록, 역대 수상자, 개인별 누적 통계 조회 가능.

### 경기 및 매칭 규칙
- **형식:** 복식(2 vs 2) 1세트 6게임 선승제 (5:5 타이브레이크). 유효 스코어는 반드시 한쪽 `6`, 상대 `0~5`.
- **성적 집계:** 복식 경기이나 순위 및 통계는 **개인전**으로 집계.
- **매칭 방식 (`경기매칭규칙.md` 참조):**
  - `HANUL_AA`: 단일 그룹(5~16명) 내 매칭.
  - `HANUL_AB`: 동수의 A/B 하위 그룹(8, 10, 12, 14, 16명)으로 나누어 반드시 반대 그룹과만 파트너 매칭.
- **순번 배정:** 참가자 입력(회원 명부 불러오기 + 직접 입력 병행) 완료 시 **그룹별 순번(시드)은 무작위(Random) 배정**.
- **코트 배정:** 기능 제외 (현장 운영).

### 순위 산정 및 대회 종료
- **순위 기준 (Tie-breaker):** `1. 승수` → `2. 득실차(득점-실점)` → `3. 다득점` → 모두 동일 시 **공동 순위** 표기 (예: 공동 2위가 2명이면 다음은 4위).
- **대회 종료:** 관리자가 종료 클릭 시 **각 그룹별 우승자(2명), 준우승자(2명), 3위(2명, 선택)**를 입력·확정한 뒤 `COMPLETED` 상태로 잠금 처리. 수상자는 기본적으로 결정전(토너먼트) 결과를 관리자가 직접 선택한다. 관리자가 원하면 **"순위표대로 채우기"**(`awardsFromStandings`)로 리그 순위 기준 후보를 채울 수 있으나, 반드시 관리자가 확인·수정 후 확정한다 (**순위 기반 자동 확정 금지**). AA는 1·2위 우승/3·4위 준우승/5·6위 3위, AB는 각 조 같은 순위끼리 한 팀, 공동 순위가 자리 경계에 걸리면 그 자리는 비운다.
- **AA 12명:** 원본의 2코트용/3코트용 중 **2코트용만 사용** (선택 기능 없음).

---

## 4. 개발 및 코드 컨벤션
- **DB 연결 캐싱:** Vercel 서버리스 환경에서 커넥션 누수를 방지하기 위해 MongoDB 클라이언트는 전역(global) 싱글톤으로 캐싱한다.
- **API 설계:** Next.js Route Handlers (`src/app/api/...`)를 사용하며, 쓰기(POST/PATCH/DELETE) 요청은 반드시 관리자 인증 미들웨어/검증을 거친다.
- **비즈니스 로직 분리:** 순위 계산(`calculateStandings`) 및 한울 대진표 생성(`generateMatches`) 로직은 순수 함수(`src/lib/...`)로 분리하여 테스트 가능하게 작성한다.
- **모바일 UX:** 모든 핵심 화면(대진표, 순위표, 점수 입력 모달)은 375px~430px 모바일 뷰포트 기준으로 한 손 조작이 편하게 설계한다.
- **디자인 시스템 (테마 2종 · 관리자 선택 · 라이트/다크 자동):**
  - 관리자가 `/admin/settings`에서 고른 테마가 `<html data-theme="default|nike">`로 모든 화면에 적용된다 (DB `settings` 컬렉션, `getCachedSiteTheme` 캐시 + `revalidateTag("site-theme")`).
    - `default`: 모던 미니멀 · 인디고 #4F46E5 · 둥근 카드 · 은은한 그림자
    - `nike`: `DESIGN.md` 기반 블랙 & 화이트 · 알약 버튼 · 모서리 0 카드 · 그림자 없음 (다크모드는 흑백 반전)
  - 두 테마를 모두 지원하도록 모양도 토큰으로 쓴다: 카드·목록 `rounded-card`, 버튼 `rounded-btn`, 안내·요약 박스 `rounded-box`, 세그먼트 탭 `rounded-tab`/`rounded-tab-item` + 선택 `bg-tab-on text-tab-on-fg`, 보조 버튼 `bg-btn2 border-btn2-line`. `rounded-2xl` 같은 고정 모서리로 카드를 만들지 않는다.
  - 글자 크기는 `globals.css`에서 Tailwind 기본값보다 15% 키워 두었다 (`text-xs`~`text-3xl`).
  - 색상은 `src/app/globals.css`의 의미 토큰만 사용한다 (`bg-bg/surface/subtle/raised`, `text-ink/muted/faint`, `border-line/line-strong`, `primary`/`primary-text`/`primary-soft`, `success/danger/warning`, `gold/silver/bronze`). `bg-white`, `text-gray-*` 등 원시 색상 클래스 금지 — 다크모드가 깨진다.
  - 공통 부품 재사용: `Button`·`Card`·`Notice`·`PageTitle`·`SectionTitle`(`components/ui.tsx`), 하단 시트 `Sheet`, 입력창 `.input`, 칩 `.chip`/`.chip-on`.
  - 아이콘은 `lucide-react`. 이모지는 메달(🥇🥈🥉)에만 사용. 폰트는 Pretendard(dynamic subset).
  - 페이지 좌우 여백 `px-4`, 카드 목록 간격 `space-y-3`, 카드 패딩 `p-4`, 터치 영역 최소 44px.

---

## 5. 주요 명령어
```bash
npm run dev      # 로컬 개발 서버 실행
npm run build    # 프로덕션 빌드 및 타입 체크
npm run lint     # ESLint 검사
npm test         # 단위 + API 통합 테스트 (vitest, 메모리 MongoDB)