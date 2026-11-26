# 테동회 월례대회 관리 (Tedong-Cup)

테니스 동호회 '테동회' 월례대회의 대진표 생성, 실시간 점수 기록, 개인 순위, 명예의 전당, 누적 통계를 관리하는 모바일 우선 웹 앱입니다.
기획은 `PRD.md`, 대진 규칙은 `경기매칭규칙.md`(원본 `Hanul-220210.pdf`)를 따릅니다.

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:3000
```

### 환경 변수 (`.env.local` / Vercel Env)

| 키 | 설명 |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas 연결 문자열 (경로에 DB 이름 포함 권장, 없으면 `tedong`) |
| `ADMIN_PASSWORD` | 관리자 로그인 비밀번호 |
| `SESSION_SECRET` | 관리자 세션 쿠키 서명 키 (32바이트 이상 무작위 문자열) |

`SESSION_SECRET` 생성: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 명령어

```bash
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드 + 타입 체크
npm run lint      # ESLint
npm test          # 단위 + API 통합 테스트 (메모리 MongoDB, 첫 실행 시 바이너리 다운로드)
npm run coverage  # 테스트 커버리지
```

## 구조

```
src/
  data/hanulRules.json     한울 AA/AB 경기 순서표 (경기매칭규칙.md에서 생성, 테스트로 불변식 검증)
  lib/                     순수 도메인 로직 (DB·Next 무관, 단위 테스트)
    generateMatches.ts     순번 무작위 배정 + 대진 생성
    standings.ts           calculateStandings: 승수 → 득실차 → 다득점 → 공동 순위
    memberStats.ts         회원 누적 통계 (종료 대회, 게스트 제외)
    hallOfFame.ts          명예의 전당
  server/                  DB 접근(repo), 인증, API 공통 처리
  proxy.ts                 /admin, 쓰기 API 인증 (Next 16: middleware → proxy)
  app/(public)/            회원 공개 화면 (하단 탭)
  app/admin/               관리자 화면
  app/api/                 Route Handlers
```

## 운영 메모

- 관리자: 화면 우측 상단 **관리** → 비밀번호 로그인. 회원은 로그인 없이 모든 기록을 조회합니다.
- 진행 중인 대회 화면은 10초마다 자동 갱신됩니다.
- 대회 종료 시 그룹별 우승 2명·준우승 2명(필수)과 3위 2명(선택)을 직접 지정하면 잠금됩니다. 결정전 결과를 입력하는 것이므로 리그 순위로 자동 입력하지 않습니다. 잠금 해제 후 수정 가능하며, 해제 중에는 통계·명예의 전당에서 빠집니다.
- 대회 기록이 있는 회원은 삭제할 수 없고 비활성화만 가능합니다.
- Next.js 16 + `cacheComponents` 사용 중: 페이지에서 DB를 읽을 때는 `<Suspense>` 안에서 `src/server/page.ts`의 `load()`를 사용하세요.
