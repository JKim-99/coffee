# 컴포즈커피 소개 홈페이지

컴포즈커피의 브랜드와 메뉴를 소개하는 정적 웹사이트입니다. 순수 HTML, CSS, JavaScript로 제작했으며, 메뉴명·사진·영양 정보는 프로젝트의 `menu.md`를 기준으로 사용합니다.

## 사이트

- 배포 홈페이지: <https://coffee-4bx.pages.dev/>
- 메뉴 목록: <https://coffee-4bx.pages.dev/menu.html>
- 문의하기: <https://coffee-4bx.pages.dev/contact.html>
- 메뉴 상세: 메뉴 카드에서 해당 상세 화면으로 이동합니다.
- 검색 크롤링 규칙: <https://coffee-4bx.pages.dev/robots.txt>
- 사이트맵: <https://coffee-4bx.pages.dev/sitemap.xml>
- GitHub 저장소: <https://github.com/JKim-99/coffee>

## 페이지 제목과 디스크립션

각 HTML 페이지는 고유한 `<title>`, 페이지 내용을 설명하는 `description`, 공유 미리보기용 `og:title`, 검색 허용용 `robots=index,follow` 메타 태그를 포함합니다.

| 페이지 | `<title>` | Description 요약 |
|---|---|---|
| `index.html` | 컴포즈커피입니다 / 컴포즈커피 | 첫 화면 인사말과 컴포즈커피 메뉴 소개 |
| `menu.html` | 메뉴 / 컴포즈커피 | 메뉴 카테고리와 메뉴 둘러보기 안내 |
| `menu-detail.html` | 메뉴 상세 / 컴포즈커피 | 선택 메뉴의 사진 및 제품 영양 정보 안내 |
| `contact.html` | 문의하기 / 컴포즈커피 | 고객상담 전화 및 문의 작성 안내 |

표에서 `/`는 페이지 제목의 구분을 읽기 쉽게 나타낸 것입니다. 페이지 제목이나 본문 헤더를 바꾸면 description과 Open Graph 제목도 함께 검토하세요.

## 주요 기능

- 메인 화면에 “안녕하세요. 컴포즈커피입니다.” 인사말과 커피 이미지 표시
- 메뉴 사진 중 서로 다른 두 장을 무작위로 선정해 첫 화면에 배치
- 전체 메뉴 중 중복 없이 12개를 무작위 선정하고 카드별 순차 애니메이션 적용
- 페이지 진입 또는 새로고침 시 랜덤 이미지와 추천 메뉴를 새로 선정
- 메뉴 페이지에서 카테고리 필터와 메뉴 이름 검색 제공
- 메뉴 카드 선택 시 상세 페이지에서 사진과 `menu.md`의 영양 정보를 표시
- 문의하기 페이지에서 문의 내역을 브라우저에 저장하고 확인·삭제할 수 있도록 제공
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

프로젝트 폴더의 `index.html`을 브라우저에서 직접 열 수 있습니다. 페이지가 정상 동작하려면 같은 폴더의 공통 리소스와 해당 페이지별 파일이 함께 있어야 합니다.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 홈페이지 메인 화면 |
| `menu.html` | 메뉴 목록, 검색, 카테고리 필터 |
| `menu-detail.html` | 선택한 메뉴의 사진과 영양 상세 |
| `contact.html` | 고객 문의 및 상담 안내 |
| `contact.css` | 문의하기 페이지의 폼 레이아웃과 반응형 스타일 |
| `contact.js` | 문의 폼 검증, 브라우저 내역 저장·조회·삭제, 모바일 메뉴 동작 |
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