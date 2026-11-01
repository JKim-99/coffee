# 컴포즈커피 비공식 소개 홈페이지

컴포즈커피의 브랜드·메뉴·영양 정보를 소개하고, 회원별 선호 메뉴와 문의·답변을 관리하는 웹사이트입니다. HTML, CSS, 바닐라 JavaScript, Cloudflare Pages Functions와 D1을 사용합니다. 컴포즈커피 공식 홈페이지가 아니며, 메뉴 자료의 문서 기준은 [`public/assets/data/menu.md`](public/assets/data/menu.md)입니다.

이 문서는 `61dffd9`까지의 커밋 이력과 QA 후속 조치가 반영된 작업 폴더 소스를 기준으로 정리했습니다. 배포 주소는 프로젝트에 기록된 주소이며, 소스 구현 여부와 실제 운영 환경의 설정·배포 상태는 구분합니다.

## 바로가기

- 로컬 홈페이지: [http://127.0.0.1:8788/](http://127.0.0.1:8788/) — 개발 서버 실행 필요
- 배포 홈페이지: [coffee-4bx.pages.dev](https://coffee-4bx.pages.dev/)
- GitHub: [JKim-99/coffee](https://github.com/JKim-99/coffee)
- D1 연결 확인 Worker: [health](https://compose-coffee-api.whddnjsqkd123.workers.dev/health)

## 주요 기능

### 홈페이지와 메뉴

- 비공식 사이트 안내와 서로 다른 두 장의 무작위 메뉴 사진을 표시합니다.
- 전체 메뉴에서 중복 없이 최대 12개를 뽑아 ‘오늘의 추천 메뉴’에 순차 표시합니다. 페이지를 다시 열면 새로 선정합니다.
- 메뉴 목록에서 카테고리, 메뉴 이름 검색, ‘내 선호 메뉴’ 필터를 제공합니다.
- 메뉴 상세 페이지에서 제품 사진, 영양 정보와 공식 제품 정보 링크를 확인할 수 있습니다. 카드에는 보유 자료의 카페인을 표시하며, 미제공 가격·알레르기는 공식 정보 확인을 안내합니다. 이미지 실패 시 메뉴명이 있는 대체 화면을 표시합니다.
- 표시용 메뉴명은 `I-`·`H-` 접두사와 HTML 엔티티를 정리합니다.
- 반응형 화면, 키보드 포커스, 이미지 대체 텍스트와 모션 감소 설정을 고려했습니다. 홈페이지에는 스크립트 실패 안내와 정적 메뉴 자료 링크가 있습니다.

### 회원과 선호 메뉴

- 회원가입, 로그인, 이메일 저장 선택, 회원 정보 조회를 제공합니다.
- 로그인한 사용자는 홈페이지 추천 메뉴, 메뉴 목록과 메뉴 상세의 하트로 선호 메뉴를 등록·해제합니다. 비회원은 로그인 후 선택한 메뉴의 상세 화면으로 돌아가 하트를 다시 눌러 저장합니다. 자동 저장하지 않습니다.
- 등록된 하트는 분홍색으로 표시하며, 상태를 D1에 저장해 페이지 이동·새로고침 후 다시 불러옵니다.
- 홈페이지에서는 하트를 바꿀 때 추천 메뉴를 다시 추첨하지 않습니다. 선호 조회·저장 장애는 로그인 만료와 구분하고, 10초 시간 제한과 재시도를 제공합니다.
- 내 정보 페이지의 상단 로그아웃은 세션을 종료하고 로그인 화면으로 이동합니다. 본문 가운데 로그아웃 버튼은 제거했습니다.

### 문의와 관리자 답변

- 문의 유형은 일반 문의, 메뉴 문의, 매장 이용 문의, 제휴 문의, 기타입니다.
- 상단·본문·푸터의 ‘문의하기’ 링크와 양식 제출은 로그인 상태를 확인하고, 로그인 후 문의 화면으로 돌아옵니다. 문의 작성 API 자체는 공개 POST로 유지되어 있습니다.
- ‘내 정보 → 문의 확인하기’에서 로그인 계정의 이메일과 일치하는 문의를 조회하고, 상세 내용과 관리자 답변을 확인합니다.
- 관리자 페이지는 별도 관리자 세션으로 보호합니다. 문의를 유형별로 묶어 건수를 표시하고, 카테고리를 선택해 볼 수 있습니다.
- 관리자는 문의 상세를 확인하고 답변을 저장할 수 있습니다. 이메일 전송이 실패하거나 미설정이어도 답변 저장 결과는 유지됩니다.
- 답변 알림 메일에는 답변 본문 대신 등록 완료 안내와 문의 확인 링크를 넣습니다.

## 페이지 구성

| 경로 | 용도 | 접근 방식 |
|---|---|---|
| `/` 또는 `/index.html` | 홈페이지·오늘의 추천 메뉴 | 공개, 하트 저장은 회원 로그인 필요 |
| `/menu.html` | 메뉴 검색·카테고리·내 선호 메뉴 | 공개, 선호 조회·변경은 회원 로그인 필요 |
| `/menu-detail.html?id=메뉴ID` | 메뉴 상세·영양 정보 | 공개 |
| `/signup.html`, `/login.html` | 회원가입·로그인 | 공개 |
| `/account.html` | 회원 정보·문의 확인 링크 | 회원 세션으로 정보 조회 |
| `/contact.html` | 문의 작성 | 헤더 진입 시 로그인 확인, 작성 API는 공개 |
| `/inquiries.html` | 본인 문의 목록 | 회원 세션 필요 |
| `/inquiry-detail.html?id=문의ID` | 본인 문의 상세·답변 | 회원 세션 및 작성 이메일 일치 필요 |
| `/admin.html` | 관리자 로그인·문의 분류·답변 | 별도 관리자 세션 필요 |

Cloudflare Pages에서는 `.html` 경로가 확장자 없는 경로로 리디렉션될 수 있습니다. 회원 정보, 문의 내역·상세, 관리자 페이지는 `noindex,nofollow`로 설정되어 있습니다. 공개 페이지의 색인 설정은 각 HTML, [`public/robots.txt`](public/robots.txt), [`public/sitemap.xml`](public/sitemap.xml)에서 관리합니다. 검색 색인 설정은 접근 권한을 대신하지 않습니다.

## 기술 구성과 데이터

| 구성 | 역할 |
|---|---|
| HTML / CSS / JavaScript | 별도 프런트엔드 빌드 없이 정적 화면과 인터랙션 제공 |
| Cloudflare Pages | 정적 파일 호스팅 |
| Pages Functions | `/api` 아래 회원·문의·관리자·선호 메뉴 처리 |
| Cloudflare D1 | 회원, 세션 해시, 문의, 답변, 선호 메뉴 저장 |
| 독립 Worker | `/health`에서 D1 연결 및 문의·회원 행 수 확인 |
| Wrangler | 로컬 실행, D1 마이그레이션 및 배포 도구 |

Pages와 독립 Worker는 각각 `wrangler.toml`, `wrangler.worker.toml`을 사용하고, 같은 D1 데이터베이스를 `DB`로 바인딩합니다. `nodejs_compat`가 설정되어 있습니다. Worker는 회원·문의 API 서버가 아니라 연결 확인용입니다.

### 데이터베이스 마이그레이션

기존 파일을 수정하기보다 새 마이그레이션을 추가해 변경 이력을 유지합니다.

| 파일 | 변경 내용 |
|---|---|
| [`0001_create_inquiries.sql`](migrations/0001_create_inquiries.sql) | 문의 테이블 |
| [`0002_add_update_and_delete_timestamps.sql`](migrations/0002_add_update_and_delete_timestamps.sql) | 문의 수정·소프트 삭제 시각 |
| [`0003_create_users.sql`](migrations/0003_create_users.sql) | 회원 테이블 |
| [`0004_add_user_session_fields.sql`](migrations/0004_add_user_session_fields.sql) | 회원 세션 해시·만료 시각 |
| [`0005_add_inquiry_subject.sql`](migrations/0005_add_inquiry_subject.sql) | 문의 제목 |
| [`0006_add_admin_replies.sql`](migrations/0006_add_admin_replies.sql) | 관리자 세션·문의 답변·메일 상태 |
| [`0007_create_favorite_menus.sql`](migrations/0007_create_favorite_menus.sql) | 회원별 선호 메뉴, `(user_id, menu_id)` 복합 기본 키 |

선호 메뉴는 회원 ID와 메뉴 ID를 저장하며 동일 회원의 중복 등록을 막습니다. 문의 소유권은 회원 ID가 아닌 로그인 회원의 이메일과 문의 작성 이메일의 일치 여부로 확인합니다.

## 로컬 실행

Node.js 22 이상과 npm이 필요합니다. 저장소에 포함된 Wrangler 버전의 Node 요구 사항을 기준으로 합니다.

```sh
git clone https://github.com/JKim-99/coffee.git
cd coffee
npm ci
npx wrangler d1 migrations apply compose-coffee-inquiries --local
npm run dev
```

실행 후 [로컬 홈페이지](http://127.0.0.1:8788/), [회원 정보](http://127.0.0.1:8788/account.html), [관리자 페이지](http://127.0.0.1:8788/admin.html)를 확인합니다. 단순 정적 파일 서버만으로는 회원·문의·선호 메뉴 API가 동작하지 않습니다.

- 로컬 D1은 `.wrangler/` 아래에 생성되며 원격 D1과 별개입니다.
- 관리자 환경변수 `ADMIN_PASSWORD`가 없을 때, 호스트가 `localhost` 또는 `127.0.0.1`인 로컬 환경에서만 `admin` / `admin1234` 로그인을 허용합니다.
- 포트가 사용 중이면 기존 서버를 확인하거나 다른 포트를 지정합니다. 디버거 포트도 충돌하면 `--inspector-port`를 별도로 지정합니다.
- `.wrangler/`, `.dev.vars*`, `node_modules/`는 버전 관리에서 제외합니다. 로컬 DB·테스트 데이터·환경변수를 커밋하지 않습니다.

## 검증

추가 패키지 없이 Node의 기본 테스트 실행기를 사용합니다.

```sh
npm test
node --check public/assets/js/app.js
node --check public/assets/js/favorites.js
node --check public/assets/js/admin.js
node --check public/assets/js/account.js
node --check public/assets/js/site-auth.js
git diff --check
```

현재 자동 검사 34개는 실제 화면 스크립트를 최소 DOM·모의 API 환경에서 실행합니다.

- [`favorites.test.cjs`](tests/favorites.test.cjs): 홈페이지 스크립트 연결, 저장 상태 복원, 등록·해제 요청, 추천 카드 유지, 초기 조회 중 클릭·중복 클릭, 비로그인 안내, 저장 실패, 메뉴 선호 필터
- [`account-admin.test.cjs`](tests/account-admin.test.cjs): 내 정보 및 다른 페이지의 상단 로그아웃, 실패 시 재시도, 가운데 버튼 제거, 문의 카테고리 묶음·건수·필터·새로고침, 빈 목록 및 HTML 이스케이프

- [`home-qa.test.cjs`](tests/home-qa.test.cjs): 스크립트 동시 실행 시 메뉴 이벤트 중복 방지, 안전한 로그인 복귀, 문의 링크·직접 제출, 이미지 대체 및 선택 메뉴 확인

이 검사는 실제 브라우저, Cloudflare D1, 운영 이메일 발송의 통합 검증을 대체하지 않습니다. 홈페이지 QA 조치에서는 로컬 브라우저로 320·375·680·681px 화면과 모바일 메뉴의 클릭·키보드 동작, 비회원 하트의 로그인 이동을 확인했습니다. 실제 계정으로 로그인해 D1에 저장하는 통합 검증과 200% 확대·실기기 검증은 완료하지 않았습니다. 상세 결과는 [`docs/QA.md`](docs/QA.md)의 조치 결과를 확인하세요. 운영 전에는 로그인 → 선호 등록 → 새로고침 → 문의 작성 → 관리자 답변 → 본인 답변 확인 → 로그아웃 흐름을 별도로 확인해야 합니다.

## 배포와 운영 설정

아래 명령은 운영자가 필요할 때 실행하는 절차이며, 이 문서 작성 과정에서 배포나 원격 마이그레이션을 실행한 것은 아닙니다.

1. Cloudflare Pages에서 저장소와 `main` 브랜치 연결 상태를 확인합니다. 정적 파일과 배포 출력 디렉터리는 `public/`이며 별도 앱 빌드는 없습니다.
2. `wrangler.toml`의 실제 D1 연결과 Pages의 `DB` 바인딩을 확인합니다. 기존 데이터베이스를 사용하는 프로젝트이므로 새 D1을 중복 생성할 필요는 없습니다. 다른 계정에서 운영한다면 해당 계정의 D1 정보로 두 Wrangler 설정을 함께 변경합니다.
3. Preview·Production 환경의 바인딩과 마이그레이션 적용 대상을 각각 확인합니다. 운영 D1 변경 전에는 백업 및 적용할 SQL을 검토합니다.
4. 운영 관리자 비밀번호를 Pages secret `ADMIN_PASSWORD`로 등록합니다. 운영에서는 이 값이 없으면 관리자 로그인에 실패합니다.
5. 기존 `/api/inquiries` 관리 메서드를 사용할 경우 아래의 Cloudflare Access 조건을 적용합니다.
6. 답변 알림이 필요하면 발신 도메인을 검증하고 `EMAIL` 바인딩과 `EMAIL_FROM`을 준비합니다.

```sh
# 원격 D1 스키마 적용
npx wrangler d1 migrations apply compose-coffee-inquiries --remote

# 입력 프롬프트에서 관리자 비밀번호 등록
npx wrangler pages secret put ADMIN_PASSWORD --project-name coffee

# Pages를 직접 배포하는 경우
npm run deploy

# 독립 연결 확인 Worker를 배포하는 경우
npx wrangler deploy --config wrangler.worker.toml
```

운영 관리자 비밀번호, 세션 토큰과 실제 회원·문의 데이터는 저장소나 문서에 기록하지 않습니다. 공개 `/health`는 문의·회원 행 수를 반환하므로 운영 시 공개 범위를 고려합니다.

### 인증과 API 경계

- 회원 비밀번호는 scrypt 해시로 저장합니다. 세션은 무작위 토큰을 쿠키로 전달하고 SHA-256 해시와 만료 시각을 D1에 저장합니다.
- 회원 쿠키는 HttpOnly·SameSite=Lax, 관리자 쿠키는 HttpOnly·SameSite=Strict이며 HTTPS에서 Secure를 사용합니다. 회원 세션은 7일, 관리자 세션은 8시간입니다.
- 관리자는 별도 쿠키와 관리자 세션 해시를 사용합니다. 일반 회원 로그인으로 관리자 API를 사용할 수 없습니다.
- ‘이메일 저장’은 로그인에 성공한 이메일만 브라우저 `localStorage`에 저장합니다. 비밀번호는 저장하지 않습니다.
- 레거시 `/api/inquiries`의 GET·PUT·DELETE는 `cf-access-authenticated-user-email` 헤더 유무를 검사합니다. 애플리케이션 자체에서 Access 토큰을 검증하지 않으므로, Cloudflare Access가 해당 요청을 실제로 보호하고 신뢰 가능한 인증 헤더를 제공하는 구성이 전제입니다. 헤더 검사만으로 운영 보호가 완료된 것으로 간주하면 안 됩니다.

| API | 메서드 | 접근·동작 |
|---|---|---|
| `/api/auth/signup` | POST | 회원가입 |
| `/api/auth/login` | POST | 회원 로그인·세션 발급 |
| `/api/auth/me` | GET / DELETE | 회원 정보 조회 / 회원 로그아웃 |
| `/api/my/favorites` | GET / POST / DELETE | 회원의 선호 목록 / 등록 / `?menuId=` 해제 |
| `/api/my/inquiries` | GET | 회원 이메일에 해당하는 목록, `?id=`로 본인 문의 상세 |
| `/api/inquiries` | POST | 공개 문의 작성 |
| `/api/inquiries` | GET / PUT / DELETE | Access 보호 전제의 기존 관리 API, 수정·삭제는 `?id=` |
| `/api/admin/login` | POST | 관리자 로그인 |
| `/api/admin/logout` | POST | 관리자 로그아웃 |
| `/api/admin/inquiries` | GET / POST | 관리자 문의 목록 / `?id=`로 답변 저장 |
| 독립 Worker `/health` | GET | D1 연결 및 문의·회원 행 수 |

회원 문의 목록은 최근 100건, 관리자 문의 목록은 최근 200건을 반환합니다. 관리자 화면의 카테고리 건수와 필터는 불러온 목록을 기준으로 하며, 전체 DB에 대한 집계나 서버 페이지네이션은 구현되어 있지 않습니다.

### 답변 이메일 상태

| 상태 | 의미 |
|---|---|
| `not_sent` | 아직 답변 알림을 보내지 않음 |
| `pending` | 답변 저장 후 알림 처리 중 |
| `sent` | 이메일 전송 호출 성공 |
| `not_configured` | `EMAIL` 또는 `EMAIL_FROM`이 없음 |
| `failed` | 이메일 전송 처리 실패 |

메일 실패와 관계없이 저장된 답변은 회원 문의 상세 화면에서 확인할 수 있습니다. 운영 발신 도메인·바인딩 설정 및 실제 수신 여부는 별도 확인이 필요합니다. 저장소만으로 현재 Cloudflare 계정의 설정 완료 여부를 판단할 수 없습니다.

## 폴더 구조

```text
coffee/
├── public/                 # Pages가 공개하는 파일만 배치
│   ├── *.html              # 기존 페이지 URL 유지
│   ├── robots.txt
│   ├── sitemap.xml
│   └── assets/
│       ├── css/            # 공통·페이지 스타일
│       ├── js/             # 화면 스크립트
│       └── data/           # menu-data.js 및 메뉴 원본 menu.md
├── functions/api/          # Pages Functions: 기존 /api 경로 유지
├── migrations/             # D1 마이그레이션
├── workers/                # 독립 연결 확인 Worker
├── tests/                  # Node 회귀 검사
├── docs/                   # QA·제작 지침·검토 문서
├── harness/                # 작업 규칙·작업 메모
├── README.md
├── package.json
├── package-lock.json
├── wrangler.toml
└── wrangler.worker.toml
```

페이지와 API 주소는 유지합니다. 브라우저용 스크립트·스타일·메뉴 자료의 주소만 `/assets/` 아래로 변경했습니다. 예전 `/menu.md` 주소는 `/assets/data/menu.md`로 연결합니다. 로컬 실행·배포는 저장소 루트에서 실행하며 `functions/`는 `public/` 밖의 루트에 유지합니다. Cloudflare Pages 대시보드의 출력 디렉터리도 `public`과 일치해야 합니다.

## 주요 파일

| 파일·디렉터리 | 역할 |
|---|---|
| `public/index.html`, `public/menu.html`, `public/menu-detail.html` | 홈페이지·메뉴 목록·상세 |
| `public/assets/js/app.js`, `public/assets/data/menu-data.js`, `public/assets/css/styles.css` | 메뉴 렌더링·검색·공통 화면 |
| `public/assets/js/favorites.js` | 홈페이지·메뉴 목록·상세의 선호 메뉴 조회·저장 |
| `public/signup.html`, `public/login.html`, `public/assets/js/auth.js`, `public/assets/css/auth.css` | 회원가입·로그인 화면 및 처리 |
| `public/account.html`, `public/assets/js/account.js` | 회원 정보 조회·문의 확인 링크 |
| `public/assets/js/site-auth.js` | 공통 모바일 메뉴·회원 내비게이션·문의 링크 로그인 확인·상단 로그아웃 |
| `public/contact.html`, `public/assets/js/contact.js`, `public/assets/css/contact.css` | 문의 작성 및 기존 Access 관리 이력 |
| `public/inquiries.html`, `public/assets/js/inquiries.js` | 회원 본인의 문의 목록 |
| `public/inquiry-detail.html`, `public/assets/js/inquiry-detail.js`, `public/assets/css/account.css` | 본인 문의 상세·답변 및 문의 화면 스타일 |
| `public/admin.html`, `public/assets/js/admin.js`, `public/assets/css/admin.css` | 관리자 로그인·문의 카테고리·답변 화면 |
| `functions/api/` | 회원·문의·선호·관리자 API |
| `migrations/` | 순서대로 적용하는 D1 스키마 변경 |
| `workers/api.js` | 독립 D1 연결 확인 Worker |
| `wrangler.toml`, `wrangler.worker.toml` | Pages·Worker 설정과 D1 바인딩 |
| `tests/*.test.cjs` | 자동 회귀 검사 |
| `harness/agent.md`, `harness/todo.md` | 작업 규칙·작업 메모, 일부 체크 항목은 과거 진행 상태 |
| `docs/guide.md`, `docs/review.md`, `public/assets/data/menu.md` | 제작 지침·초기 검토 요청·메뉴 원본 자료 |
| `public/robots.txt`, `public/sitemap.xml` | 검색 크롤링과 사이트맵 |

## 커밋 이력으로 보는 개발 과정

전체 이력은 `git log --reverse --oneline`으로 확인할 수 있습니다. 아래는 현재 기능으로 이어지는 주요 커밋입니다.

| 단계 | 주요 커밋 | 구현·변경 |
|---|---|---|
| 제작 기반 | `9d5bc18`, `85dd043`, `9210ed5` | 제작 지침, 메뉴·영양 자료, 정적 홈페이지 |
| 랜덤 추천 | `1a190b9`, `b7927c4`, `c77fc74` | 추천 메뉴 무작위 선정, 히어로 사진, 최대 12개 카드 |
| 검색 메타데이터 | `d1c96c1`, `b6dbf8e`, `a1c186d`, `f907e14` | 페이지 제목·설명, robots, 사이트맵 및 병합 |
| 메뉴 표시·문의 | `884e9d1`, `c6bf5fb`, `119104f`, `2505ff9` | 메뉴명 정리, 문의 화면, D1 저장, 수정·삭제 시각 |
| 회원·D1 연결 | `830d882`, `861645d`, `1add84e`, `777bb9b` | 회원 테이블, 공유 D1 Worker, 인증 API, Cloudflare 해싱 수정 |
| 회원 정보·문의 이력 | `f2112a6`, `6c36e6e`, `8c2ec4b`, `10db415`, `4e2d74e` | 프로필, 회원 내비게이션, 본인 문의 목록·상세, 이메일 저장 |
| 관리자 답변 | `f6bf38d`, `5442956`, `a01625a`, `8f1a816` | 별도 관리자 세션, 답변 저장·알림, 회원 답변 확인 화면 |
| 선호 메뉴 | `74d34e8`, `c473e03`, `0c90acb`, `3d0f067`, `d9e8cf0`, `01b5ef2` | 회원별 선호 저장, 분홍 하트, 상태 갱신, 필터 유지, ID 정규화 |
| 로그인 확인 | `6980af6` | 헤더 문의 링크 진입 시 로그인 확인 |
| 홈페이지 하트 수정 | `b987c41` | 추천 메뉴 저장 로직 연결, 공통 하트 갱신, 초기 조회·중복 클릭 처리 및 검사 |
| 관리자 분류·로그아웃 수정 | `9fb1a99` | 문의 카테고리별 묶음·필터, 상단 로그아웃 연결, 가운데 버튼 제거 및 검사 |

QA 후속 조치는 [`docs/QA.md`](docs/QA.md)의 항목별 조치 결과에 기록되어 있습니다.

## 메뉴 자료 관리

메뉴를 변경할 때는 [`public/assets/data/menu.md`](public/assets/data/menu.md)와 [`public/assets/data/menu-data.js`](public/assets/data/menu-data.js)를 함께 갱신합니다. 선호 메뉴와 상세 링크가 메뉴 ID를 기준으로 하므로 기존 항목의 ID를 임의로 바꾸지 않습니다. 사진은 외부 공식 사이트 주소를 사용하므로 외부 서비스의 변경·장애 영향을 받을 수 있습니다. 영양 정보와 판매 여부는 제공 시점·매장에 따라 달라질 수 있으며, 확인되지 않은 값은 추정하지 않습니다.

- [컴포즈커피 공식 홈페이지](https://composecoffee.com/index1)
- [공식 브랜드 소개](https://composecoffee.com/about)
- [공식 메뉴·영양 정보](https://composecoffee.com/index.php?mid=compose&act=dispCafemenuGalleryList)
- [공식 매장 찾기](https://composecoffee.com/findstore)
