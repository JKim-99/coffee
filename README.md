# 컴포즈커피 소개 홈페이지

컴포즈커피의 브랜드와 메뉴를 소개하는 정적 웹사이트입니다. HTML, CSS, JavaScript로 구성하며 메뉴 목록과 제품 정보를 `menu.md`에서 관리합니다.

## 페이지 미리보기

- 배포 페이지: <https://coffee-4bx.pages.dev/>
- 메뉴: <https://coffee-4bx.pages.dev/menu.html>
- 메뉴 상세: 메뉴 카드에서 이동합니다.

## 로컬에서 실행

프로젝트 폴더의 `index.html`을 브라우저에서 열면 메인 페이지를 확인할 수 있습니다. 메뉴 화면과 상세 페이지가 정상적으로 동작하려면 같은 폴더의 `styles.css`, `app.js`, `menu-data.js` 파일도 함께 있어야 합니다.

## 주요 기능

- 메인 페이지: “안녕하세요. 컴포즈커피입니다.” 인사말과 메뉴 사진을 표시합니다.
- 랜덤 이미지: 메인 화면의 커피 사진 두 장을 메뉴 사진 중 서로 다르게 무작위 선택합니다.
- 추천 메뉴: 전체 메뉴에서 중복 없이 12개를 무작위로 선정하며, 카드가 순차 애니메이션으로 표시됩니다. 페이지를 열 때마다 추천 구성이 새로 선정됩니다.
- 메뉴 목록: 카테고리 필터와 메뉴명 검색을 제공합니다.
- 메뉴 상세: 메뉴 사진과 `menu.md`의 영양 정보를 표시하고 공식 상세 페이지로 연결합니다.
- 반응형 화면과 키보드 탐색, 모션 감소 설정을 고려합니다.

## 파일 구성

| 파일 | 설명 |
|---|---|
| `index.html` | 메인 페이지 |
| `menu.html` | 메뉴 목록·검색·카테고리 필터 페이지 |
| `menu-detail.html` | 선택 메뉴의 사진·영양 정보 상세 페이지 |
| `styles.css` | 페이지 스타일 및 반응형·애니메이션 |
| `app.js` | 랜덤 메뉴·이미지, 검색, 필터, 상세 화면 로직 |
| `menu-data.js` | `menu.md`를 기반으로 생성한 브라우저용 메뉴 데이터 |
| `menu.md` | 메뉴명, 사진 URL, 영양 정보, 공식 상세 링크 |
| `guide.md` | 홈페이지 제작·콘텐츠·접근성 가이드 |
| `review.md` | 수정 요청 및 검토 기록 |

## 메뉴 데이터 갱신

`menu.md`가 메뉴 정보의 문서 기준입니다. 메뉴를 변경할 때 메뉴명, 카테고리, 사진, 상세 URL 및 영양 값을 확인하고 브라우저용 `menu-data.js`에도 같은 데이터가 반영되도록 갱신하세요. 누락된 영양 값을 임의로 추정하지 말고, 최신 자료는 [컴포즈커피 공식 메뉴](https://composecoffee.com/index.php?mid=compose&act=dispCafemenuGalleryList)에서 확인하세요.

## 배포 및 검색 엔진 설정

현재 확인된 배포 주소는 <https://coffee-4bx.pages.dev/>입니다. 검색 크롤링 허용 파일 `robots.txt`와 사이트맵 `sitemap.xml`은 `robots` 브랜치에 준비되어 있으며, 이 README 작성 시점의 `main`에는 아직 포함되지 않았습니다.

## Git 브랜치

- `main`: 홈페이지 기본 버전 및 병합된 페이지 제목·디스크립션 메타데이터
- `page_title`: 각 페이지 제목과 `description`, Open Graph 제목 개선 사항. `main`에 병합됨.
- `robots`: 모든 경로 크롤링 허용 규칙과 배포 주소 기반 사이트맵. `main`과 별도로 관리 중.

## 공식 참고 링크

- [컴포즈커피 홈페이지](https://composecoffee.com/index1)
- [브랜드 소개](https://composecoffee.com/about)
- [매장 찾기](https://composecoffee.com/findstore)
- [고객의 소리](https://composecoffee.com/custumer)