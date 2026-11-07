# Agent 작업 하네스

## 프로젝트 개요

- 프로젝트: 컴포즈커피 비공식 소개 웹사이트
- 저장소: `https://github.com/JKim-99/coffee`
- 기본 브랜치: `main`
- 작업 폴더: `/Users/jongwonkim/Desktop/aistudy/coffee`
- 기본 로컬 홈페이지 주소: `http://127.0.0.1:8788/`
- 공개 Pages 사이트: `https://coffee-4bx.pages.dev/`
- 독립 Worker health endpoint: `https://compose-coffee-api.whddnjsqkd123.workers.dev/health`

## 사용자 작업 방식 및 응답 선호

- 사용자에게 한국어로 응답하고, 코드 변경 전 짧고 구체적인 계획을 먼저 제시한다.
- 기존 프로젝트의 HTML/CSS/바닐라 JavaScript 구조와 Cloudflare 패턴을 유지한다.
- 파일을 수정한 뒤 가능한 문법 검사, HTML/로컬 링크 검사, 실제 로컬 실행/API 테스트를 수행한다.
- 사용자가 커밋·푸시를 요청하면 관련 변경을 검토하고 커밋·푸시한 뒤 원격 상태를 검증한다. 요청하지 않으면 자동으로 커밋·푸시하지 않는다.
- URL을 안내할 때 별도 요청이 없으면 공개 URL보다 브라우저에서 열 수 있는 로컬 URL을 먼저 제공한다.
- 변경 작업 완료 응답의 마지막에는 홈페이지 로컬 URL을 적는다.
- 실제 계정/문의 데이터를 테스트할 때는 테스트용임을 구분하고, 임시 데이터는 테스트 종료 후 정리한다.

## 기술 구성

- Frontend: `public/` 아래 정적 HTML, `public/assets/css/`의 CSS, `public/assets/js/`의 브라우저 JavaScript. 빌드 프레임워크는 사용하지 않는다.
- Hosting/API: Cloudflare Pages 및 Pages Functions (`/functions/api/...`).
- Database: Cloudflare D1(SQLite semantics), DB binding 이름은 `DB`.
- 독립 Worker: `workers/api.js`, 설정은 `wrangler.worker.toml`. D1 연결 상태를 `/health`로 확인한다.
- Pages 설정: `wrangler.toml`.
- D1 migrations: `/migrations/0001...0006...` 순서로 관리한다.
- 메뉴 기준 자료: `public/assets/data/menu.md`; 브라우저용 데이터는 `public/assets/data/menu-data.js`.
- 문서: `docs/`; 회귀 검사: `tests/` (`npm test`). 로컬 실행: 저장소 루트에서 `npm run dev`; 배포 출력: `public/`.
- 개발 도구: `npm`/Node.js, Wrangler (`npx wrangler`). `node_modules/`, `.wrangler/`는 버전 관리하지 않는다.

## 현재 데이터/인증 동작

- `inquiries`: 문의자 이름·이메일·유형·제목·내용 및 생성/수정/삭제 시각을 저장한다. 삭제는 소프트 삭제다.
- 문의 POST는 회원 세션을 요구하며, 작성자 이름·이메일·회원 ID는 서버가 세션에서 확정한다. 사용자별 목록/상세는 회원 ID로 소유권을 검사하며 기존 user_id NULL 행에만 이메일 일치 조회를 유지한다. 0008 migration 적용을 권장한다. 컬럼이 없는 기존 DB에는 인증된 이메일 기반 호환 모드를 사용하며 다른 DB 오류는 숨기지 않는다. 2026-11-07 원격 migration은 Cloudflare 접근 권한 오류(7403)로 미적용이다.
- 전체 관리자 문의 API는 Cloudflare Access 보호를 전제로 한다. Access 없이 관리자 목록을 공개하지 않는다.
- `users`: 닉네임, 고유 이메일, `password_hash`, 성별, 타임스탬프, 세션 해시/만료 시각을 저장한다.
- 비밀번호 원문은 저장하지 않는다. 현재 해시 방식은 `scrypt` (`node:crypto`)이고 Pages/Worker 호환성 설정에 `nodejs_compat`가 필요하다.
- 로그인 세션은 원문 토큰이 아닌 SHA-256 해시를 D1에 기록하고 HttpOnly/SameSite 쿠키를 사용한다. HTTPS에서는 Secure 속성을 설정한다.
- 로그인 페이지의 “이메일 저장”은 체크된 경우에만 성공한 이메일을 해당 브라우저의 `localStorage`에 저장한다. 비밀번호를 브라우저 저장소에 저장하지 않는다.
- 회원 정보와 문의 내역은 세션 인증을 통해 본인 것만 조회한다. 문의 페이지 열람은 공개하고 등록 시 인증한다.
- 관리자 세션은 일반 사용자 세션과 분리된 D1 hash/expiry로 검증한다. Production 관리자 인증은 Pages secret `ADMIN_PASSWORD`가 설정되어야 동작하며, 기본 `admin1234`는 localhost 개발 전용이다.
- 답변 이메일은 Email Sending 도메인 및 `EMAIL`/`EMAIL_FROM` 설정이 있어야 발송된다. 설정 미완료 시 답변은 저장하되 `not_configured` 상태를 남긴다. 메일 본문에 관리자 답변 내용을 포함하지 않고 문의 링크만 보낸다.

## 구현·검증 체크리스트

1. 코드베이스와 git 상태, 관련 HTML/API/schema를 먼저 확인한다.
2. 개인정보 경계와 인증이 필요한 API를 먼저 구분한다.
3. D1 schema 변경은 기존 데이터를 보존하는 새 migration으로 추가한다. 과거 migration을 수정해 배포 DB와 어긋나게 하지 않는다.
4. 사용자가 지정한 페이지/컴포넌트 외에 같은 내비게이션이나 데이터 흐름에 필요한 파일만 최소 범위로 수정한다.
5. `node --check`로 변경 JS를 점검하고 `git diff --check`를 실행한다.
6. 정적 HTML 로컬 참조를 검사하고, 가능하면 `wrangler pages dev`에서 API 통합 테스트를 수행한다.
7. 원격 D1/Cloudflare에 변경을 적용할 때 로컬·원격 환경을 혼동하지 않고, 테스트 계정/문의 데이터는 정리한다.
8. 수정 파일과 최종 git 상태를 다시 확인한다.

## 알려진 주의사항

- Cloudflare Pages에서 `/signup.html`, `/login.html` 등의 파일 URL은 extensionless URL(`/signup`, `/login`)로 308 리디렉션될 수 있다.
- production에서 API를 확인할 때 Cloudflare edge가 테스트 클라이언트 User-Agent를 차단할 수 있다. 가능하면 먼저 로컬 Pages Functions+D1에서 통합 검증한다.
- `.wrangler` 아래에는 로컬 D1 DB, SQL export 및 테스트 자료가 생길 수 있으니 절대 git에 추가하지 않는다.
- SQLite 테스트 export에는 실제 문의 개인정보가 포함될 수 있다. 확인·전달·업로드 전 행 수와 데이터 종류를 점검하고, 테스트 기록을 임의로 production 데이터처럼 추가하지 않는다.
- Worker health endpoint는 공개적으로 테이블 행 수를 보여준다. 민감한 컬럼/행 데이터는 반환하지 않는다.
