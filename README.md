# Prism

매주 여러 소스(Product Hunt · Indie Hackers · Hacker News · Reddit)에서 상위 서비스·스레드를 분해해 보여주는 리서치 대시보드. Next.js + Turso(libSQL) + Render.

원격 에이전트가 매주 자동으로 소스별 리포트를 생성 → GitHub API `repository_dispatch` → GitHub Actions relay → Render 인게스트 API 로 밀어넣고, 대시보드/상세 페이지에서 시각화된 인사이트를 읽는다.

## 로컬 개발

1. `.env` 작성

   ```bash
   TURSO_URL=libsql://...
   TURSO_TOKEN=...
   INGEST_API_KEY=원격-에이전트-공유-비밀
   PH_TOKEN=          # (선택) Product Hunt 공식 API 토큰. 있으면 서비스 아이콘 리졸빙 정확도 상승
   ```

2. 의존성 설치 + DB 마이그레이션

   ```bash
   npm install
   npm run db:migrate
   ```

3. 개발 서버

   ```bash
   npm run dev
   ```

   브라우저에서 `http://localhost:8080` 접속.

## Render 배포

`render.yaml` 을 포함한 Render **Blueprint** 프로젝트. 서비스 URL: `https://notepad-dvf7.onrender.com`.

1. GitHub push
2. Render 대시보드에서 **New → Blueprint** → 이 레포 연결
3. sync: false 로 표시된 환경 변수 입력:
   - `TURSO_URL`
   - `TURSO_TOKEN`
   - `INGEST_API_KEY`
   - `PH_TOKEN` (선택)
4. DB 마이그레이션은 **로컬에서 수동 실행** (Render 셸 env 노출 이슈로 자동 실행 안 함):

   ```bash
   npm run db:migrate
   ```

이후 `main` 브랜치 push 마다 자동 재배포.

> Render 무료 플랜: 15분 요청 없으면 sleep → 다음 요청 때 ~30초 cold start. 월 750시간.

## PWA (홈 화면에 추가)

Chrome 안드로이드에서 배포 URL 접속 → 우상단 ⋮ → **홈 화면에 추가** → 독립 앱 창으로 실행. iOS 사파리는 공유 → 홈 화면에 추가.

## 멀티 소스 파이프라인

### 지원 소스 (2026-07-13 기준)

| Source | 스케줄 (KST) | 프롬프트 |
|---|---|---|
| Product Hunt | 매주 월 09시 | `scripts/prompts/product-hunt-research-prompt.md` |
| Indie Hackers | 매주 화 09시 | `scripts/prompts/indie-hackers-research-prompt.md` |
| Hacker News | 매주 수 09시 | `scripts/prompts/hacker-news-research-prompt.md` |
| Reddit | 매주 목 09시 | `scripts/prompts/reddit-research-prompt.md` |

### 인게스트 흐름 (로컬 launchd + Claude Code CLI)

```
[macOS launchd (매주 요일별 09:00 KST)]
        |
        v
[scripts/local-runner.sh <source>]
   - 프롬프트 md 로드
   - `claude -p ...` (Claude Code CLI, 기존 구독 auth 사용 → 무료)
   - WebSearch/WebFetch 로 리서치
   - 응답에서 JSON 추출
        |
        v
[POST https://notepad-dvf7.onrender.com/api/reports/ingest]
        |
        v
[Turso libSQL]
```

**셋업 (한 번만):**

```bash
scripts/install-local-schedule.sh
```

4개 plist 를 `~/Library/LaunchAgents/com.prism.research.<source>.plist` 로 생성 후 launchd 에 등록. 매주 KST 월/화/수/목 09시에 자동 실행.

**로그**: `~/Library/Logs/prism/<source>.{out,err}.log`

**관리 명령:**
```bash
launchctl list | grep com.prism.research    # 등록 상태 확인
scripts/local-runner.sh product_hunt         # 수동 즉시 실행 (테스트)
scripts/install-local-schedule.sh unload     # 스케줄 전체 해제
scripts/install-local-schedule.sh            # 다시 설치 (idempotent)
```

**전제**: `claude` CLI (Claude Code) 가 PATH 에 있고 로그인돼 있어야 함 (`claude login`). 이미 로그인된 Claude Pro/Max 구독을 사용하므로 API credit 추가 소비 없음.

**주의**: launchd 는 로컬 시간대(KST) 기준으로 스케줄. 맥이 스케줄 시각에 켜져있어야 함 (슬립 상태에서 깨면 놓친 실행 catch-up).

> 초기엔 Claude Code Remote (CCR) 스케줄 routine 방식이었으나 `*.onrender.com` egress 차단 + `repository_dispatch` API 세션 제한. 이후 GitHub Actions + Anthropic API 도 검토했으나 API 유료 이슈로 로컬 launchd + 기존 Claude 구독 조합으로 정착 (2026-07-13). GitHub Actions workflow (`.github/workflows/weekly-research.yml`) 는 백업/수동 dispatch 용으로 유지.

### 인게스트 API 스펙

`POST /api/reports/ingest`

- 헤더: `Authorization: Bearer <INGEST_API_KEY>`
- 바디: `ResearchData` (see `src/lib/types.ts`) + `source: "product_hunt" | "indie_hackers" | "hacker_news" | "reddit"` + optional `report_date`

### 문체 규칙 (모든 프롬프트 통일)

원격 에이전트가 생성하는 리포트 톤은 4개 소스 모두 동일한 규칙을 따른다 (report/3 톤):

- 명사구·간결 종결. Essay·서술체 금지.
- `collectionSummary`: 3문장 이내, 총 120자.
- 각 테마 `narrative`: 1~2문장, 총 60자.
- `ridingTrend`: 1문장 60자 이내. 트렌드명 + 참고 서비스 괄호.
- `koreaGap`: 1문장 80자 이내. "…이 부재" 종결.
- `description`: 2~3문장 총 120자. 순서: "무엇을 → 스택/근거 → MVP 가능성".
- 형용사·부사 최소화. "…합니다" 지양, "…다." 또는 명사구 우선.

각 프롬프트 md 파일에 명세됨.

## 주요 기능

### 대시보드 (`/`)

- 상단 소스 필터 탭 (전체 · Product Hunt · Indie Hackers · Hacker News · Reddit) — 소스별 카운트 뱃지
- 최신 리포트 hero 카드 (Top Pick + Fastest validation + CTA + 소스 뱃지)
- KPI 4개: 이번 주 서비스(±델타), 이번 주 테마(±델타), 새로 등장한 테마, 누적
- 반복 테마 (`ChipCloud`) · 반복 문제 정의 (`RankedList`) · 시장 세그먼트 (`ThemeDistributionChart`)
- 지난 리포트 아카이브 (각 카드에 소스 뱃지)

### 상세 (`/report/[id]`)

- 헤더에 소스 뱃지 + "주간 {소스명} 리서치" 타이틀
- Fastest validation hero (accent 카드)
- 표본/테마/Top 아이디어/최대 시장 KPI
- **01 테마 분포** · **02 서비스** · **03 공통 문제** · **04 시장 규모** · **05 Top 5 아이디어**

### 서비스 아이콘 자동 리졸빙 (`/api/service-icon`)

리포트 데이터에 URL이 없어도 서비스 이름만으로 실제 로고 표시. 302 redirect 방식, 메모리 LRU 캐시(성공 24h·실패 30m).

우선순위:

1. `iconUrl` 필드
2. **PH GraphQL API** (`PH_TOKEN` env 있으면)
3. **Wayback Machine** (Cloudflare 봇 감지 우회)
4. Google favicon
5. 이니셜 배지

## 디자인 시스템

Pretendard Variable, 최소 12px 강제. Base Gallery Blue 600 (#266EF1) accent, ACCENT_SOFT `#DEE9FE`. 편집형 여백(섹션 간격 56px, 카드 padding 28px, radius 10px).

**소스 뱃지 컬러** (`SOURCE_ACCENT`):
- Product Hunt — Orange 600 / 50
- Indie Hackers — Blue 600 / 50
- Hacker News — Amber 600 / 50
- Reddit — Red 600 / 50

시각화 팔레트 10색 (테마·세그먼트 구분).

## Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS
- Turso libSQL (SQLite over the wire)
- recharts (ScatterChart 만 사용, 나머지는 커스텀)
- Render 무료 티어 web service
- GitHub Actions (인게스트 relay)

## 히스토리

- **2026-07-13** 스케줄러를 GitHub Actions + Anthropic API (web_search 툴) 로 이동. CCR routine 폐기 (`repository_dispatch` 세션 제한 우회)
- **2026-07-13** Reddit 소스 추가 (4번째 소스, 매주 목 09시 KST)
- **2026-07-13** 문체 규칙 통일 (report/3 톤 · 명사구·간결)
- **2026-07-13** 멀티 소스 지원 (PH + IH + HN) · `weekly_reports.source` 컬럼 · 대시보드 소스 필터 탭
- **2026-07-10** Prism 브랜딩 + PWA + 로그인 제거
- **2026-07-10** 디자인·정보위계 전면 개편 (Mobbin 톤) + PH 아이콘 자동 리졸버
- **2026-07-09** 디자인 폴리싱 + Pretendard + 최소 12px
- **2026-07-08** 사용자 요청 레이아웃으로 상세 페이지 재구성 + 스키마 재구성
- **2026-07-07** recharts 도입 + 시각화 확장
- **2026-07-07** 전면 대시보드 개편: PH Weekly Research 전용
- **2026-07-06** 노트 템플릿 기능 추가: 주간 Product Hunt 리서치 템플릿
- **초기** Evernote 스타일 메모장 (Notepad) — 이후 리서치 대시보드로 피벗
