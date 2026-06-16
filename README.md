# Notepad

에버노트 스타일의 1인용 메모장. Next.js + Turso(libSQL) + Tiptap.

## 로컬 개발

1. `.env` 작성 (이미 있는 파일에 비밀번호 / 세션 시크릿 추가)

   ```bash
   TURSO_URL=libsql://...
   TURSO_TOKEN=...
   APP_PASSWORD=내가-쓸-비밀번호
   SESSION_SECRET=$(openssl rand -hex 32)
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

   브라우저에서 `http://localhost:3000` 접속 → `APP_PASSWORD`로 로그인.

## Render 배포

이 레포는 `render.yaml`을 포함한 Render **Blueprint** 프로젝트야.

1. GitHub에 push.
2. Render 대시보드에서 **New → Blueprint** 선택 → 이 레포 연결.
3. 환경 변수 입력 (sync: false 로 표시된 것들):
   - `TURSO_URL`
   - `TURSO_TOKEN`
   - `APP_PASSWORD`
4. `SESSION_SECRET`은 Blueprint가 자동 생성.
5. 첫 배포 후 한 번만 마이그레이션 실행 (Shell 또는 로컬에서):

   ```bash
   TURSO_URL=... TURSO_TOKEN=... npm run db:migrate
   ```

이후 `main` 브랜치에 push할 때마다 자동 재배포돼.

> Render 무료 플랜이라 15분 동안 요청 없으면 sleep → 다음 요청 때 30초쯤 cold start가 있어. 월 750시간 한도.

## 키 기능

- 3컬럼 레이아웃 (노트북 / 노트목록 / 에디터)
- Tiptap 리치 텍스트 (제목, 굵게/기울임, 목록, 체크박스, 인용, 코드 블록, 링크)
- 자동 저장 (~700ms 디바운스)
- 노트북별 필터 + 전체 검색
- 비밀번호 1개로 보호되는 단일 사용자
