# 수정 규칙 (커넥터로 이 저장소를 고칠 때)

사용자는 한국어로 요청합니다. 답변과 커밋 메시지도 한국어로.

## 어디를 고치나
- 데이터만 바뀌는 요청(정당색, 후보, 득표율, 시나리오, 지역 성향, 연립 투표) → `data/*.json`만 수정. JS는 건드리지 않기.
- 정당 추가: `data/parties.json`의 `parties`에 넣되 `order`는 배열 순서(왼쪽=좌파 → 오른쪽=우파)로 정해짐. 모든 `presets`의 `smd`/`pr`에 같은 `id` 값을 추가할 것. 비례에 안 나오는 정당은 `pr`을 0.
- 테마 추가/수정: `css/style.css`의 `:root[data-skin="..."]` 토큰 블록과 `js/app.js`의 `SKINS` 배열을 함께 수정.
- 계산 방식: `js/sim.js` (순수 함수, DOM 없음). `node`로 바로 테스트 가능.

## 지켜야 할 것
- 지역구 합계 289, 비례 합계 176을 유지 (`prefectures.json`의 `seats`, `blocks.json`의 `seats`).
- `prefectures.json`의 `code`(JP01~JP47)는 `jp.json`의 `properties.id`와 일치해야 지도가 칠해짐.
- 정당색은 위키백과 정당색 기준. 근거 없는 색으로 바꾸지 않기.
- `jp.json`은 원본 지도 파일이므로 수정하지 않기.
- 외부 라이브러리 없이 순수 HTML/CSS/JS 유지 (GitHub Pages에서 그대로 동작).
