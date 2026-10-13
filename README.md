# jp-parliament-simulator
일본 중의원의원 선거에 대한 자신의 성향으로 만드는겁니다

**중의원 시뮬레이터 衆議院 · 1928 — 2026**

▶ **사이트: https://hosain1291.github.io/jp-parliament-simulator/**
　[한국어](https://hosain1291.github.io/jp-parliament-simulator/) · [English](https://hosain1291.github.io/jp-parliament-simulator/en.html) · [日本語](https://hosain1291.github.io/jp-parliament-simulator/ja.html)

[국회 시뮬레이터](https://github.com/Hosain1291/national-assembly-simulator)와 같은 방식의 일본판입니다.
첫 남자 보통선거인 1928년 제16회부터 2026년 제51회까지 **중의원 총선 36회**(총선마다 질문 27–52개, 모두 1,185개) 가운데 하나를 고르고,
분야별 중요도를 정한 뒤 쟁점마다 막대를 움직여 답하면 당신의 입장대로 중의원이 다시 구성됩니다.

## 다루는 시대
| 시대 | 총선 | 선거제도 |
|---|---|---|
| 전전 정당정치·전시 | 제16–21회 (1928–1942) | 중선거구 |
| 점령기·보수 재편 | 제22–27회 (1946–1955) | 1946년 대선거구 제한연기제, 이후 중선거구 |
| 55년 체제 | 제28–39회 (1958–1990) | 중선거구 |
| 정계 재편기 | 제40–44회 (1993–2005) | 1993년 중선거구, 1996년부터 소선거구비례대표병립제 |
| 민주당 정권기 | 제45회 (2009) | 병립제 |
| 아베 정권기 | 제46–48회 (2012–2017) | 병립제 |
| 기시다·이시바·다카이치 | 제49–51회 (2021–2026) | 병립제 |

## 흐름
1. **총선 고르기** — 정당 성향, 선거제도, 실제 의석
2. **분야별 중요도** — 정치·행정 / 헌법·안보 / 외교·역사 / 경제·재정 / 사회보장·노동 / 사회·인권 / 지역·에너지
3. **질문** — A안 ↔ B안 막대로 답하기. 분야 중요도에 따라 각 분야에서 묻는 질문 수가 달라집니다
4. **분야별 의석 발표** — 분야마다 의석이 늘고 줄어드는 애니메이션
5. **결과**
   - 반원 부채꼴(arch) 의석 — 지역구는 채운 원, 비례는 고리 (중선거구 시대는 지역구만)
   - **내각총리대신 지명선거** — 반원 바로 아래. 1차 투표 → 과반 없으면 결선. 정당별 투표 방침을 바꿀 수 있음.
     전전·1946년은 천황이 총리를 임명했으므로 “가상 지명선거”로 표시
   - 위키백과식 선거 인포박스
   - 도도부현 지도 (`jp.json`)
   - 분야별 의석, 정당 스펙트럼 맵, 의결 정족수(과반·안정다수·절대안정다수·3분의 2)
   - 연립 정권 구성과 시대별 내각 부처 배분
   - 나와 가까운 정당, 질문별 표결

테마: 자동 · 라이트 · 다크 · 핑크(#7B1C4F) · 올드 페이퍼 · 윈도우 95
언어: 한국어(`index.html`) · English(`en.html`) · 日本語(`ja.html`) — 오른쪽 위에서 전환

## 파일 구성
```
index.html / en.html / ja.html   언어별 화면 뼈대 (tools/build_pages.py로 생성, 파일을 바로 열어도 동작)
css/style.css                    스타일과 테마 6종
questions/NN-YYYY.txt            총선별 질문 원본 (한국어·영어·일본어를 한 곳에, 정당 위치 포함)
js/data-elections-early.js       1928–1993 총선·정당 데이터 (제16–40회)
js/data-elections.js             1996–2026 총선·정당 데이터 (제41–51회), 정당색, 시대 구분
js/data-questions.js             질문 (questions/에서 자동 생성)
js/i18n-en-q.js, i18n-ja-q.js    질문 번역 (questions/에서 자동 생성)
js/data-prefs.js                 47개 도도부현 이름·정원·지역 성향
js/data-map.js                   jp.json에서 만든 지도 경로 (자동 생성)
js/i18n-ko.js                    한국어 화면 문구
js/i18n-en.js, i18n-en-data-*.js 영어 화면 문구 / 정당·인물·총선 설명 번역
js/i18n-ja.js, i18n-ja-data-*.js 일본어 화면 문구 / 총선 설명 번역
js/i18n-apply.js                 번역을 데이터에 덮어씀
js/engine.js                     계산 엔진 (의석 배분, 총리 지명, 연립, 지도 배치)
js/app.js                        화면 5단계 (세 언어 공용)
tools/build_map.py               jp.json → js/data-map.js 변환
tools/build_pages.py             index/en/ja.html 생성
tools/build_questions.js         questions/*.txt → 질문 JS 생성 + 검사 (질문 수 27–52, 정당 키, 시점, 번역 누락)
jp.json                          도도부현 경계 원본 (simplemaps)
favicon/favicon.svg              아이콘
CLAUDE.md                        커넥터(Claude)로 고칠 때의 규칙
```

## 고치는 법
코드를 몰라도 `js/data-*.js`만 고치면 됩니다. GitHub 커넥터로 Claude에게 “2024년 공명당 색을 바꿔줘”, “1958년 질문을 하나 추가해줘”처럼 요청해도 됩니다. 규칙은 `CLAUDE.md`에 있습니다.

- 정당색 → `js/data-elections.js` 맨 위 `C` (전전·전후 초기 정당은 `data-elections-early.js`)
- 총리 후보·연립 → 각 총선의 정당 항목 마지막 칸, `gov`, `pmBloc`
- 질문 추가·수정 → `questions/NN-YYYY.txt`에 한국어·영어·일본어 세 줄을 함께 쓰고 `node tools/build_questions.js`
- 화면 문구 → `js/i18n-ko.js` / `i18n-en.js` / `i18n-ja.js`
- 머리글·바닥글·테마 버튼 이름 → `tools/build_pages.py` 수정 후 `python tools/build_pages.py`
- 지도 경계를 바꿨다면 → `python tools/build_map.py`

## GitHub Pages 켜기
저장소 **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
1–2분 뒤 https://hosain1291.github.io/jp-parliament-simulator/ 에서 열립니다. 로컬에서는 `index.html`을 브라우저로 열면 됩니다.

## 출처와 한계
- 의석·득표·총리 지명: 위키백과 각 총선 문서. 결선 사례 1953년(요시다), 1979년(오히라), 2024년(이시바 221 · 노다 160), 2026년 다카이치 354표
- 정당색: 위키백과 정당색 기준, 확인하지 못한 일부(전전·점령기 정당, 중도개혁연합 등)는 근사값
- 1946·1947년은 결원 2석을 빼고 466석으로 계산
- 질문과 정당 위치는 대표 쟁점을 단순화한 것이라 실제 당론과 다를 수 있습니다
- 중선거구 시대는 지역구만 있고, 1996년 이후 비례대표는 11개 블록 동트식 대신 전국 단위로 계산합니다. 지도는 정당별 지역구 의석을 지역 성향으로 나눈 추정 배치입니다
