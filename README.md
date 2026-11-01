# 컴포즈커피 소개 홈페이지

컴포즈커피의 브랜드와 메뉴를 소개하는 Cloudflare Pages 웹사이트입니다. HTML, CSS, JavaScript와 Pages Functions를 사용하며, 메뉴명·사진·영양 정보는 프로젝트의 `menu.md`를 기준으로 사용합니다. 문의 내역은 Cloudflare D1(SQLite)에 저장합니다.

## 사이트

- 배포 홈페이지: <https://coffee-4bx.pages.dev/>
- D1 연결 확인용 Worker: <https://compose-coffee-api.whddnjsqkd123.workers.dev/health>
- 메뉴 목록: <https://coffee-4bx.pages.dev/menu.html>
- 문의하기: <https://coffee-4bx.pages.dev/contact.html>
- 문의 확인하기: <https://coffee-4bx.pages.dev/inquiries.html>
- 메뉴 상세: 메뉴 카드에서 해당 상세 화면으로 이동합니다.
- 검색 크롤링 규칙: <https://coffee-4bx.pages.dev/robots.txt>
- 사이트맵: <https://coffee-4bx.pages.dev/sitemap.xml>
- GitHub 저장소: <https://github.com/JKim-99/coffee>

## 페이지 제목과 디스크립션

각 HTML 페이지는 고유한 `<title>`, 페이지 내용을 설명하는 `description`, 공유 미리보기용 `og:title`, 검색 허용용 `robots=index,follow` 메타 태그를 포함합니다.

| 페이지 | `<title>` | Description 요약 |
|---|---|---|
| `index.html` | 컴포즈커피 | 컴포즈커피 소개 및 메뉴 안내 |
| `menu.html` | 메뉴 / 컴포즈커피 | 메뉴 카테고리와 메뉴 둘러보기 안내 |
| `menu-detail.html` | 메뉴 상세 / 컴포즈커피 | 선택 메뉴의 사진 및 제품 영양 정보 안내 |
| `contact.html` | 문의하기 / 컴포즈커피 | 고객상담 전화 및 문의 작성 안내 |

표에서 `/`는 페이지 제목의 구분을 읽기 쉽게 나타낸 것입니다. 페이지 제목이나 본문 헤더를 바꾸면 description과 Open Graph 제목도 함께 검토하세요.

## 주요 기능

- 메인 화면에 “공식 페이지가 아닙니다” 안내와 커피 이미지 표시
- 메뉴 사진 중 서로 다른 두 장을 무작위로 선정해 첫 화면에 배치
- 전체 메뉴 중 중복 없이 12개를 무작위 선정하고 카드별 순차 애니메이션 적용
- 페이지 진입 또는 새로고침 시 랜덤 이미지와 추천 메뉴를 새로 선정
- 메뉴 페이지에서 카테고리 필터와 메뉴 이름 검색 제공
- 메뉴 카드 선택 시 상세 페이지에서 사진과 `menu.md`의 영양 정보를 표시
- 문의하기 페이지에서 문의 내역을 Cloudflare D1에 저장하고 확인·삭제할 수 있도록 제공
- 반응형 레이아웃, 키보드 접근성 및 모션 감소 설정 고려

## 개발 과정

1. **프로젝트 문서 준비**: `guide.md`에 공식 컴포즈커피 정보, 화면 구조, 콘텐츠·접근성 원칙을 정리하고 `review.md`에 수정 요청을 기록했습니다.
2. **메뉴 자료 수집**: 공식 메뉴 페이지에서 9개 카테고리의 메뉴명, 사진, 상세 링크, 영양 정보를 확인해 `menu.md`로 정리했습니다.
3. **정적 홈페이지 제작**: `index.html`, `menu.html`, `menu-detail.html`, `contact.html`을 만들고 공통 스타일과 페이지별 JavaScript로 반응형 디자인과 탐색 기능을 구현했습니다.
4. **메뉴 데이터 연결**: `menu.md`를 바탕으로 브라우저에서 사용하는 `menu-data.js`를 만들고 메뉴 검색·필터·상세 정보를 연결했습니다.
5. **랜덤 콘텐츠 및 인터랙션**: 메인 페이지에 메뉴 12개를 중복 없이 무작위로 선택해 순차 표시하고, 히어로 이미지도 서로 다른 사진 두 장을 무작위로 선정하도록 구성했습니다.
6. **페이지 메타데이터**: 각 페이지의 제목, description, Open Graph 제목을 화면 내용에 맞추고 검색 색인을 허용했습니다.
7. **검색엔진 설정 병합**: `robots` 브랜치의 `robots.txt`와 `sitemap.xml`을 `main`에 병합하고 페이지 메타데이터와의 충돌을 해결했습니다. 크롤링은 공개 페이지 전체에 허용하고 사이트맵은 배포 URL을 가리킵니다.
8. **저장소 문서화·배포**: 개발 과정과 사용 방법을 이 README에 기록하고, 공개 배포 주소에서 사이트를 확인했습니다.

## 로컬에서 확인

Cloudflare Pages Functions 및 D1을 포함해 실행하려면 Node.js와 Wrangler가 필요합니다. 회원가입·로그인은 `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`에서 처리합니다. 비밀번호는 scrypt로 해시하고 HttpOnly 세션 쿠키를 사용합니다. 문의 API `/api/inquiries`는 POST(저장)를 공개하고, GET(목록), PUT(수정), DELETE(소프트 삭제)는 Cloudflare Access 보호를 전제로 합니다. 공개 문의 화면은 관리자 목록을 숨기며 Access가 승인한 요청에만 목록을 표시합니다. 문의 내역과 계정은 같은 D1에 저장합니다.

독립 API Worker는 `wrangler.worker.toml`로 배포하며, Pages Functions와 같은 D1 데이터베이스를 `DB` binding으로 사용합니다. Worker의 `/health`는 DB 연결과 테이블별 행 수를 반환합니다.

```sh
npm install --save-dev wrangler
npx wrangler d1 create compose-coffee-inquiries
```

위 명령은 Cloudflare 로그인/API 토큰이 있어야 합니다. 출력된 `database_id`를 `wrangler.toml`의 placeholder와 교체하고, Cloudflare Pages 프로젝트 설정의 **Settings → Functions → D1 database bindings**에서 변수명을 `DB`로 지정해 같은 데이터베이스를 연결하세요. Preview 및 Production 환경 각각에 바인딩을 구성해야 합니다. 이후 Cloudflare Zero Trust Access에서 `your-pages-domain/api/inquiries` 경로에 관리자 전용 self-hosted application 및 허용 정책을 적용하세요. Access 정책이 없는 상태에서는 GET 목록/DELETE가 401을 반환하도록 설계했습니다. 로컬 Pages 개발 서버에서는 `cf-access-authenticated-user-email` 헤더로 관리자 인증을 모의할 수 있습니다. 로컬 D1 테이블을 만든 뒤 개발 서버를 실행합니다.

```sh
npx wrangler d1 migrations apply compose-coffee-inquiries --local
npx wrangler pages dev .
```

로컬 사이트는 기본적으로 `http://localhost:8788`에서 실행됩니다. Cloudflare 배포 전에는 대시보드에서 Pages 프로젝트에 `DB` D1 바인딩과 Access 보호를 설정하고, 원격 데이터베이스에 마이그레이션을 적용해야 합니다.

```sh
npx wrangler d1 migrations apply compose-coffee-inquiries --remote
```

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 홈페이지 메인 화면 |
| `menu.html` | 메뉴 목록, 검색, 카테고리 필터 |
| `menu-detail.html` | 선택한 메뉴의 사진과 영양 상세 |
| `contact.html` | 문의 제목·내용 작성 및 문의 확인 페이지 링크 |
| `inquiries.html` | 로그인 계정에 연결된 문의 제목 목록 |
| `inquiry-detail.html` | 로그인한 작성자만 확인할 수 있는 문의 상세 |
| `inquiries.js` | 본인 이메일에 연결된 문의 제목 목록 조회 |
| `inquiry-detail.js` | 문의 상세 조회 및 접근권한 처리 |
| `account.css` | 문의 목록과 상세 페이지 스타일 |
| `account.html` | 로그인 세션으로 확인하는 회원 정보 페이지 |
| `account.js` | 인증된 회원 정보 조회 및 로그아웃 |
| `contact.css` | 문의하기 페이지의 폼 레이아웃과 반응형 스타일 |
| `contact.js` | 문의 폼 및 D1 API 연결, 내역 조회·삭제, 모바일 메뉴 동작 |
| `functions/api/inquiries.js` | 문의 데이터 저장·조회·삭제 Pages Function API |
| `functions/api/auth/` | D1 기반 회원가입, 로그인, 세션 확인·로그아웃 Pages Function API |
| `auth.js` | 회원가입·로그인 폼을 API에 연결하는 브라우저 코드 |
| `workers/api.js` | D1 연결 상태 확인용 독립 Cloudflare Worker |
| `migrations/0001_create_inquiries.sql` | 문의 내역 테이블 생성 마이그레이션 |
| `migrations/0002_add_update_and_delete_timestamps.sql` | 문의 수정·삭제 시각 컬럼 추가 마이그레이션 |
| `migrations/0003_create_users.sql` | 회원가입 데이터 저장용 유저 테이블 마이그레이션 |
| `migrations/0004_add_user_session_fields.sql` | 사용자 세션 해시 및 만료 시각 컬럼 마이그레이션 |
| `migrations/0005_add_inquiry_subject.sql` | 문의 제목 컬럼 추가 및 기존 문의 제목 채우기 |
| `wrangler.toml` | Cloudflare Pages 설정 및 D1 바인딩 |
| `wrangler.worker.toml` | 독립 Worker와 동일 D1 바인딩 설정 |
| `styles.css` | 색상, 레이아웃, 반응형 및 애니메이션 스타일 |
| `app.js` | 랜덤 메뉴·사진, 필터, 검색, 상세 페이지 동작 |
| `menu-data.js` | 메뉴 페이지에서 읽는 구조화 메뉴 데이터 |
| `menu.md` | 메뉴명, 제품 사진 URL, 영양 값, 공식 상세 링크 원본 문서 |
| `guide.md` | 홈페이지 제작 가이드라인 |
| `review.md` | 검토 의견 및 수정 요청 기록 |
| `robots.txt` | 검색 로봇 접근 허용 및 사이트맵 위치 안내 |
| `sitemap.xml` | 공개 페이지 사이트맵 |

## 메뉴 데이터 관리

메뉴 정보의 문서 기준은 `menu.md`입니다. 메뉴를 갱신할 때 공식 페이지에서 메뉴명, 카테고리, 사진, 상세 링크 및 영양 값을 다시 확인하고 `menu-data.js`에도 같은 변경을 반영하세요. 확인되지 않은 영양 값이나 알레르기 정보는 추정해 채우지 않습니다.

## Git 브랜치

- `main`: 홈페이지, 페이지별 제목·디스크립션, robots 및 sitemap 설정을 포함하는 기본 브랜치
- `page_title`: 페이지 제목·description·Open Graph 메타데이터 변경을 작업하고 `main`에 병합한 브랜치
- `robots`: 크롤러 허용 규칙과 배포 주소 기반 사이트맵을 작업하고 `main`에 병합한 브랜치
- `feature/robots-page-titles`: 초기 브랜치 설정 과정에서 생성된 이전 작업 브랜치

## 공식 자료

- [컴포즈커피 공식 홈페이지](https://composecoffee.com/index1)
- [브랜드 소개](https://composecoffee.com/about)
- [공식 메뉴·영양 정보](https://composecoffee.com/index.php?mid=compose&act=dispCafemenuGalleryList)
- [매장 찾기](https://composecoffee.com/findstore)
- [고객의 소리](https://composecoffee.com/custumer)