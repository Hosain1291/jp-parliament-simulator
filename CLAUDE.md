# 수정 규칙 (커넥터로 이 저장소를 고칠 때)

사용자는 한국어로 요청합니다. 답변·커밋 메시지는 한국어로. 화면 문구는 세 언어(한국어·영어·일본어)를 함께 고친다.
이 프로젝트는 national-assembly-simulator(한국 국회 시뮬레이터)의 일본 중의원판입니다. 흐름과 화면 구성을 그쪽과 맞춥니다.

## 어디를 고치나
- 범위: 1928년 제16회 ~ 2026년 제51회 (36회). 제16–40회는 `*-early.js`, 제41–51회는 `data-elections.js`/`data-questions.js`.
- 데이터만 바뀌는 요청(정당색, 대표, 총리 후보, 의석, 연립, 질문) → `js/data-elections*.js`, `js/data-questions*.js`만 수정. 화면 코드는 건드리지 않기.
- 중선거구 총선은 `sys:'mmd'`, `L:0`(비례 없음). 전전·1946년은 `pmMode:'appoint'`(천황 임명, 가상 지명선거).
- 정당색은 `js/data-elections.js` 맨 위 `C` 한 곳에서 관리. 위키백과 정당색 기준, 근거 없는 색으로 바꾸지 않기.
- 새 총선 추가: `DATA`에 항목, `QSET`에 같은 번호의 질문 배열, `ERAS`에 번호 추가, 그리고 `i18n-en-data-*.js`·`i18n-ja-data-*.js`의 `E[번호]`에 번역.
- 질문 형식: `[제목, A안 정당 키, B안 정당 키, A안, B안, {정당: -1…1}, 축('e'|'s'|''), 분야, '연.월']`. 분야 키는 pol con dip eco wel soc reg.
- 테마: `css/style.css`의 `html:root[data-skin="…"]` 토큰과 `tools/build_pages.py`의 테마 버튼을 함께 수정.

## 세 언어 (ko / en / ja)
- `index.html`·`en.html`·`ja.html`은 `tools/build_pages.py`로 만든다. 직접 고치지 말고 스크립트를 고친 뒤 `python tools/build_pages.py`.
- 화면 문구는 `js/i18n-ko.js`, `i18n-en.js`, `i18n-ja.js`의 `ui`에 같은 키로. 한 언어에만 키를 추가하지 않기.
- 질문을 추가·수정하면 `i18n-en-data-*.js`, `i18n-ja-data-*.js`의 같은 총선 `Q` 배열에도 **같은 순서**로 `[제목, A안, B안]`을 넣는다.
- 새 정당은 영어판 `parties`(이름), 각 언어 `E[번호].P[키]`(설명)에도 추가. 새 인물은 영어판 `people`에 로마자 이름.
- 일본어판은 정당 `ja`, 인물 원어 이름을 그대로 쓴다.
- 계산: `js/engine.js` (순수 함수, node로 테스트 가능).

## 지켜야 할 것
- 각 총선의 정당 의석 합계 = `N`, 지역구 합 = `D`, 비례 합 = `L`.
- 질문의 정당 키는 그 총선의 정당 키와 일치해야 함.
- 질문은 그 선거 전에 있었던 일만. 정당 위치는 단순화임을 화면 하단 문구로 밝히고 있음.
- `jp.json`은 원본. 바꿨다면 `python tools/build_map.py`로 `js/data-map.js`를 다시 만들 것(직접 수정 금지).
- 외부 라이브러리 없이 순수 HTML/CSS/JS 유지(파일을 바로 열어도 동작해야 함).
- 수정 뒤 확인: `node -e` 로 데이터 합계와 키를 검사하고, en/ja 화면에 한국어가 섞이지 않았는지, 브라우저에서 첫 화면 → 결과까지 한 번 진행.
